import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PlaceSyncJobStatus,
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
import { withRetry } from '../common/utils/retry';
import { LeadsService } from '../leads/leads.service';

export interface PlaceSyncRunParams {
  placeSyncJobId: string;
  city?: string;
  category?: string;
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

const WEBSITE_CHECK_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — Doc 22 §13, shared with M1
const CANDIDATE_CONCURRENCY = 5; // Doc 22 §12
const MAX_SEARCH_PAGES = 3;
const PAGE_TOKEN_DELAY_MS = 2000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000; // linear backoff: 1s, then 2s

type CandidateOutcome = 'created' | 'updated' | 'skipped';

interface WebsiteClassificationResult {
  websiteUri: string | null;
  status: WebsiteStatus;
  detectionMethod: WebsiteDetectionMethod;
}

type CostTracker = (calls: number, costUsd: number) => void;

// Module M5's sync engine — the PlaceSyncJob equivalent of
// DiscoveryRunnerService, sharing the same website-check cache namespace
// and cost constants but its own job-status lifecycle (QUEUED/RUNNING/
// COMPLETED/FAILED/PARTIAL — Doc 21 M5 entry) and progress fields
// (apiCallsUsed/estimatedCost/businessesFound/Created/Updated/Failed,
// startedAt/finishedAt/duration/successRate).
//
// Retries (Doc 21 M5 "retry failed requests"): each individual provider
// call is wrapped in withRetry (2 retries, linear backoff) — a candidate
// that still fails afterward is caught by the per-candidate try/catch in
// run() so it never fails the whole job, matching M1's FR-1.8 precedent.
@Injectable()
export class PlaceSyncRunnerService {
  private readonly logger = new Logger(PlaceSyncRunnerService.name);

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

  async run(params: PlaceSyncRunParams): Promise<void> {
    const startedAt = new Date();
    let apiCallsUsed = 0;
    let estimatedCost = 0;
    const trackCost: CostTracker = (calls, costUsd) => {
      apiCallsUsed += calls;
      estimatedCost += costUsd;
    };

    try {
      await this.prisma.placeSyncJob.update({
        where: { id: params.placeSyncJobId },
        data: { status: PlaceSyncJobStatus.RUNNING, startedAt },
      });

      const candidates = await this.searchCandidates(params, trackCost);

      // Progress tracking (Doc 21 M5 entry): persisted as soon as the
      // search phase completes, not only at the very end, so a poller
      // (GET /place-sync-jobs/:id) sees real progress on a long-running job.
      await this.prisma.placeSyncJob.update({
        where: { id: params.placeSyncJobId },
        data: { businessesFound: candidates.length, apiCallsUsed, estimatedCost },
      });

      let created = 0;
      let updated = 0;
      let failed = 0;

      await processWithConcurrency(candidates, CANDIDATE_CONCURRENCY, async (candidate) => {
        try {
          const outcome = await this.processCandidate(candidate, params, trackCost);
          if (outcome === 'created') {
            created += 1;
          } else if (outcome === 'updated') {
            updated += 1;
          }
        } catch (error) {
          failed += 1;
          this.logger.error(
            `Place sync job ${params.placeSyncJobId}: failed processing candidate ${candidate.providerId}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      });

      const finishedAt = new Date();
      const duration = durationSeconds(startedAt, finishedAt);
      const processed = created + updated + failed;
      const successRate = processed === 0 ? null : (created + updated) / processed;
      const status = resolveFinalStatus(failed, created + updated);

      await this.prisma.placeSyncJob.update({
        where: { id: params.placeSyncJobId },
        data: {
          status,
          finishedAt,
          duration,
          successRate,
          apiCallsUsed,
          estimatedCost,
          businessesCreated: created,
          businessesUpdated: updated,
          businessesFailed: failed,
        },
      });
    } catch (error) {
      // A failure at this level (search itself failed even after retries,
      // quota exceeded before any candidate work started, etc.) fails the
      // whole job — there's nothing partial to preserve in that case.
      const finishedAt = new Date();
      this.logger.error(
        `Place sync job ${params.placeSyncJobId} failed`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.prisma.placeSyncJob
        .update({
          where: { id: params.placeSyncJobId },
          data: {
            status: PlaceSyncJobStatus.FAILED,
            finishedAt,
            duration: durationSeconds(startedAt, finishedAt),
            apiCallsUsed,
            estimatedCost,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        })
        .catch(() => {
          // best-effort — if even this write fails, the job is stuck
          // "running" and needs manual/ops attention, not a retry loop here.
        });
    }
  }

  private async searchCandidates(
    params: PlaceSyncRunParams,
    trackCost: CostTracker,
  ): Promise<LocationCandidate[]> {
    return withRetry(
      () =>
        collectSearchPages(
          this.locationProvider,
          {
            city: params.city,
            category: params.category,
            keyword: params.keyword,
            latitude: params.latitude,
            longitude: params.longitude,
            radiusMeters: params.radiusMeters,
          },
          {
            maxPages: MAX_SEARCH_PAGES,
            pageDelayMs: PAGE_TOKEN_DELAY_MS,
            onPage: async () => {
              // Reserve-then-call (CostService.charge's atomic
              // INCRBY-based pattern) per page actually fetched, not once
              // for the whole (possibly multi-page) search — apiCallsUsed/
              // estimatedCost are Module M5's own fields and should reflect
              // real Places API call volume.
              trackCost(1, PLACES_SEARCH_COST_USD);
              await this.costService.charge('google_places_search', PLACES_SEARCH_COST_USD, {
                city: params.city,
                category: params.category,
                keyword: params.keyword,
                latitude: params.latitude,
                longitude: params.longitude,
              });
            },
          },
        ),
      { retries: RETRY_ATTEMPTS, delayMs: RETRY_DELAY_MS },
    );
  }

  private async processCandidate(
    candidate: LocationCandidate,
    params: PlaceSyncRunParams,
    trackCost: CostTracker,
  ): Promise<CandidateOutcome> {
    const { websiteUri, status, detectionMethod } = await this.classifyWebsite(
      candidate.providerId,
      trackCost,
    );
    const prismaStatus = toPrismaWebsiteStatus(status);
    const category = params.category ?? candidate.primaryType ?? 'uncategorized';
    // Places' search field mask has no dedicated locality field; the full
    // formatted address is the best available fallback when this job was
    // started by coordinates rather than a named city (Doc 21 M5 entry,
    // known limitation).
    const city = params.city ?? candidate.formattedAddress;

    if (prismaStatus === PrismaWebsiteStatus.PRESENT) {
      // Same FR-1.3-equivalent gating as DiscoveryRunnerService: a
      // brand-new `present` candidate is discarded, an existing one still
      // gets refreshed.
      const existingBusiness = await this.businessService.findByPlaceId(candidate.providerId);
      if (!existingBusiness) {
        return 'skipped';
      }

      const { wasNew } = await this.businessService.upsertByPlaceId({
        googlePlaceId: candidate.providerId,
        businessName: candidate.displayName,
        category,
        city,
        address: candidate.formattedAddress,
        placesData: { candidate, websiteUri } as unknown as Prisma.InputJsonValue,
        websiteStatus: prismaStatus,
        websiteDetectionMethod: detectionMethod,
        lastSyncJobId: params.placeSyncJobId,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      });
      return wasNew ? 'created' : 'updated';
    }

    trackCost(1, PLACES_FULL_DETAILS_COST_USD);
    await this.costService.charge('google_places_details_full', PLACES_FULL_DETAILS_COST_USD, {
      placeId: candidate.providerId,
    });
    const fullDetails = await withRetry(
      () => this.locationProvider.getDetails(candidate.providerId),
      { retries: RETRY_ATTEMPTS, delayMs: RETRY_DELAY_MS },
    );

    const { id: businessId, wasNew } = await this.businessService.upsertByPlaceId({
      googlePlaceId: candidate.providerId,
      businessName: candidate.displayName,
      category,
      city,
      address: candidate.formattedAddress,
      placesData: { candidate, websiteUri, fullDetails } as unknown as Prisma.InputJsonValue,
      websiteStatus: prismaStatus,
      websiteDetectionMethod: detectionMethod,
      lastSyncJobId: params.placeSyncJobId,
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

    return wasNew ? 'created' : 'updated';
  }

  /**
   * Cheap-tier website check + heuristic/AI classification, cached as one
   * unit per provider id (Doc 22 §13) — shares its cache namespace with
   * DiscoveryRunnerService (Module M1), so a place already checked by
   * either module skips both the Details call and the site
   * fetch/classification for the other.
   */
  private async classifyWebsite(
    providerId: string,
    trackCost: CostTracker,
  ): Promise<WebsiteClassificationResult> {
    const cacheKey = `website-check:${providerId}`;
    const cached = await this.cache.getJson<WebsiteClassificationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    trackCost(1, PLACES_WEBSITE_CHECK_COST_USD);
    await this.costService.charge('google_places_details_cheap', PLACES_WEBSITE_CHECK_COST_USD, {
      placeId: providerId,
    });
    const websiteUri = await withRetry(() => this.locationProvider.getWebsiteUri(providerId), {
      retries: RETRY_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
    });

    let status: WebsiteStatus;
    let detectionMethod: WebsiteDetectionMethod;
    if (!websiteUri) {
      status = 'none';
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

function durationSeconds(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 1000);
}

// PARTIAL exists as its own outcome (see PlaceSyncJobStatus's schema
// comment) — distinct from a clean COMPLETED (no failures) and a total
// FAILED (nothing succeeded, when at least one candidate was attempted).
function resolveFinalStatus(failedCount: number, succeededCount: number): PlaceSyncJobStatus {
  if (failedCount === 0) {
    return PlaceSyncJobStatus.COMPLETED;
  }
  return succeededCount > 0 ? PlaceSyncJobStatus.PARTIAL : PlaceSyncJobStatus.FAILED;
}
