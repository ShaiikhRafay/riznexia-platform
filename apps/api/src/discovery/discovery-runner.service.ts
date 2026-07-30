import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DiscoveryJobStatus,
  WebsiteDetectionMethod,
  WebsiteStatusType as PrismaWebsiteStatus,
} from '@riznexia/db';
import type { Prisma, PrismaClient } from '@riznexia/db';
import type { RedisCacheService } from '@riznexia/cache';
import type { WebsiteStatus } from '@riznexia/shared-types';
import { WebsiteFetchAdapter } from '../common/adapters/website-fetch.adapter';
import { WebsiteStatusClassifier } from '../common/classifiers/website-status.classifier';
import { BusinessService } from '../business/business.service';
import { toPrismaWebsiteStatus } from '../business/business.mapper';
import { REDIS_CACHE } from '../common/cache/cache.constants';
import { CostService } from '../common/cost/cost.service';
import {
  PLACES_FULL_DETAILS_COST_USD,
  PLACES_SEARCH_COST_USD,
  PLACES_WEBSITE_CHECK_COST_USD,
} from '../common/cost/cost.constants';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { LOCATION_PROVIDER } from '../common/providers/location-provider.interface';
import type {
  LocationCandidate,
  LocationProvider,
} from '../common/providers/location-provider.interface';
import { collectSearchPages } from '../common/utils/paginate-search';
import { processWithConcurrency } from '../common/utils/concurrency';
import { LeadsService } from '../leads/leads.service';

export interface DiscoveryRunParams {
  discoveryJobId: string;
  city: string;
  category: string;
  radiusKm: number;
}

const SEARCH_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h — Doc 22 §13
const WEBSITE_CHECK_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — Doc 22 §13
const CANDIDATE_CONCURRENCY = 5; // Doc 22 §12
const MAX_SEARCH_PAGES = 3; // Google's own cap: 3 pages x 20 results = 60 candidates
const PAGE_TOKEN_DELAY_MS = 2000; // a fresh pageToken is not immediately valid

interface WebsiteClassificationResult {
  websiteUri: string | null;
  status: WebsiteStatus;
  detectionMethod: WebsiteDetectionMethod;
}

// The pipeline's actual business logic (Doc 22 §5/§6), deliberately a
// plain injectable service with no Trigger.dev-specific code in it —
// DECISIONS.md D-004. DiscoveryService dispatches this in-process today;
// wiring it into a real task() definition later doesn't require touching
// anything in this file.
//
// Module M5 (DECISIONS.md D-033+, AskUserQuestion resolution "apply the
// rule everywhere, including M1"): depends only on the LocationProvider
// interface, never a concrete provider, and owns its own page-loop —
// PlacesAdapter no longer loops internally (Doc 21 M5 entry).
@Injectable()
export class DiscoveryRunnerService {
  private readonly logger = new Logger(DiscoveryRunnerService.name);

  constructor(
    @Inject(LOCATION_PROVIDER) private readonly locationProvider: LocationProvider,
    private readonly websiteFetchAdapter: WebsiteFetchAdapter,
    private readonly classifier: WebsiteStatusClassifier,
    private readonly businessService: BusinessService,
    private readonly leadsService: LeadsService,
    private readonly costService: CostService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(REDIS_CACHE) private readonly cache: RedisCacheService,
  ) {}

  async run(params: DiscoveryRunParams): Promise<void> {
    try {
      // Marking RUNNING lives inside the try block deliberately — if this
      // specific call throws (a transient DB blip, say), the job must
      // still reach the FAILED branch below rather than being stuck in
      // QUEUED forever with no further status transition possible.
      await this.prisma.discoveryJob.update({
        where: { id: params.discoveryJobId },
        data: { status: DiscoveryJobStatus.RUNNING },
      });

      const candidates = await this.searchCandidates(params);

      let resultsCount = 0;
      await processWithConcurrency(candidates, CANDIDATE_CONCURRENCY, async (candidate) => {
        try {
          const qualified = await this.processCandidate(candidate, params);
          if (qualified) {
            resultsCount += 1;
          }
        } catch (error) {
          // FR-1.8 — one candidate's failure never fails the whole job;
          // whatever else succeeds is still persisted.
          this.logger.error(
            `Discovery job ${params.discoveryJobId}: failed processing candidate ${candidate.providerId}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      });

      await this.prisma.discoveryJob.update({
        where: { id: params.discoveryJobId },
        data: { status: DiscoveryJobStatus.COMPLETED, resultsCount },
      });
    } catch (error) {
      // A failure at this level (search itself failed, quota exceeded
      // before any candidate work started, etc.) fails the whole job —
      // there's nothing partial to preserve in that case.
      this.logger.error(
        `Discovery job ${params.discoveryJobId} failed`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.prisma.discoveryJob
        .update({
          where: { id: params.discoveryJobId },
          data: { status: DiscoveryJobStatus.FAILED },
        })
        .catch(() => {
          // best-effort — if even this write fails, the job is stuck
          // "running" and needs manual/ops attention, not a retry loop here.
        });
    }
  }

  private async searchCandidates(params: DiscoveryRunParams): Promise<LocationCandidate[]> {
    const cacheKey = `discovery:${params.city}:${params.category}`;
    return this.cache.getOrSetJson(cacheKey, SEARCH_CACHE_TTL_SECONDS, async () => {
      // Reserve-then-call, not call-then-record: CostService.charge()
      // atomically claims the budget before we spend it, closing the
      // check-then-act race the previous assertWithinBudget()+recordCost()
      // pair had under concurrent discovery jobs.
      await this.costService.charge('google_places_search', PLACES_SEARCH_COST_USD, {
        city: params.city,
        category: params.category,
      });
      return collectSearchPages(
        this.locationProvider,
        { city: params.city, category: params.category },
        { maxPages: MAX_SEARCH_PAGES, pageDelayMs: PAGE_TOKEN_DELAY_MS },
      );
    });
  }

  /** Returns true if this candidate ended up qualifying (persisted as none/outdated). */
  private async processCandidate(
    candidate: LocationCandidate,
    params: DiscoveryRunParams,
  ): Promise<boolean> {
    const { websiteUri, status, detectionMethod } = await this.classifyWebsite(
      candidate.providerId,
    );
    const prismaStatus = toPrismaWebsiteStatus(status);

    if (prismaStatus === PrismaWebsiteStatus.PRESENT) {
      // A brand-new `present` candidate is discarded entirely (FR-1.3) —
      // not even recorded as a Business. An already-discovered business
      // that's now `present` still gets its business-data refreshed so the
      // CRM reflects reality (FR-1.7); its Lead, if any, and that Lead's
      // pipeline state are never touched by this branch. Gating on "does a
      // Business already exist" rather than "does a Lead already exist" is
      // equivalent under Module M2's design — a Business row is only ever
      // created alongside a Lead in the qualifying branch below, never on
      // its own.
      const existingBusiness = await this.businessService.findByPlaceId(candidate.providerId);
      if (!existingBusiness) {
        return false;
      }

      await this.businessService.upsertByPlaceId({
        googlePlaceId: candidate.providerId,
        businessName: candidate.displayName,
        category: params.category,
        city: params.city,
        address: candidate.formattedAddress,
        placesData: { candidate, websiteUri } as unknown as Prisma.InputJsonValue,
        websiteStatus: prismaStatus,
        websiteDetectionMethod: detectionMethod,
        discoveryJobId: params.discoveryJobId,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      });
      return false; // refreshed, but not a new qualifying result for this job's count
    }

    await this.costService.charge('google_places_details_full', PLACES_FULL_DETAILS_COST_USD, {
      placeId: candidate.providerId,
    });
    const fullDetails = await this.locationProvider.getDetails(candidate.providerId);

    const { id: businessId } = await this.businessService.upsertByPlaceId({
      googlePlaceId: candidate.providerId,
      businessName: candidate.displayName,
      category: params.category,
      city: params.city,
      address: candidate.formattedAddress,
      placesData: { candidate, websiteUri, fullDetails } as unknown as Prisma.InputJsonValue,
      websiteStatus: prismaStatus,
      websiteDetectionMethod: detectionMethod,
      discoveryJobId: params.discoveryJobId,
      latitude: fullDetails.latitude ?? candidate.latitude,
      longitude: fullDetails.longitude ?? candidate.longitude,
      phone: fullDetails.phone,
      rating: fullDetails.rating,
      reviewCount: fullDetails.userRatingCount,
      openingHours: fullDetails.openingHours as Prisma.InputJsonValue | undefined,
      photos: fullDetails.photos as unknown as Prisma.InputJsonValue,
      googleBusinessUrl: fullDetails.profileUrl,
    });
    await this.leadsService.ensureForBusiness(businessId);

    return true;
  }

  /**
   * Cheap-tier website check + heuristic/AI classification, cached as one
   * unit per place_id (Doc 22 §13) — a cache hit skips both the Places
   * Details call *and* the site fetch/classification entirely, not just
   * the classification result.
   */
  private async classifyWebsite(providerId: string): Promise<WebsiteClassificationResult> {
    const cacheKey = `website-check:${providerId}`;
    const cached = await this.cache.getJson<WebsiteClassificationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.costService.charge('google_places_details_cheap', PLACES_WEBSITE_CHECK_COST_USD, {
      placeId: providerId,
    });
    const websiteUri = await this.locationProvider.getWebsiteUri(providerId);

    let status: WebsiteStatus;
    let detectionMethod: WebsiteDetectionMethod;
    if (!websiteUri) {
      status = 'none';
      // Google's own field settled it — no fetch needed.
      detectionMethod = WebsiteDetectionMethod.GOOGLE_API;
    } else {
      const fetchResult = await this.websiteFetchAdapter.fetch(websiteUri);
      const classification = await this.classifier.classify(fetchResult);
      status = classification.status;
      detectionMethod = WebsiteDetectionMethod.HEURISTIC_SCAN;
    }

    const result: WebsiteClassificationResult = { websiteUri, status, detectionMethod };
    await this.cache.setJson(cacheKey, result, WEBSITE_CHECK_CACHE_TTL_SECONDS);
    return result;
  }
}
