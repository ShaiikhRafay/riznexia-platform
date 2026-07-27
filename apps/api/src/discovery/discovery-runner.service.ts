import { Inject, Injectable, Logger } from '@nestjs/common';
import { DiscoveryJobStatus, WebsiteStatusType as PrismaWebsiteStatus } from '@riznexia/db';
import type { Prisma, PrismaClient } from '@riznexia/db';
import type { RedisCacheService } from '@riznexia/cache';
import type { WebsiteStatus } from '@riznexia/shared-types';
import { PlacesAdapter } from '../common/adapters/places.adapter';
import type { PlacesCandidate } from '../common/adapters/places.types';
import { WebsiteFetchAdapter } from '../common/adapters/website-fetch.adapter';
import { WebsiteStatusClassifier } from '../common/classifiers/website-status.classifier';
import { REDIS_CACHE } from '../common/cache/cache.constants';
import { CostService } from '../common/cost/cost.service';
import {
  PLACES_FULL_DETAILS_COST_USD,
  PLACES_SEARCH_COST_USD,
  PLACES_WEBSITE_CHECK_COST_USD,
} from '../common/cost/cost.constants';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { processWithConcurrency } from '../common/utils/concurrency';
import { toPrismaWebsiteStatus } from '../leads/lead.mapper';
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

interface WebsiteClassificationResult {
  websiteUri: string | null;
  status: WebsiteStatus;
}

// The pipeline's actual business logic (Doc 22 §5/§6), deliberately a
// plain injectable service with no Trigger.dev-specific code in it —
// DECISIONS.md D-004. DiscoveryService dispatches this in-process today;
// wiring it into a real task() definition later doesn't require touching
// anything in this file.
@Injectable()
export class DiscoveryRunnerService {
  private readonly logger = new Logger(DiscoveryRunnerService.name);

  constructor(
    private readonly placesAdapter: PlacesAdapter,
    private readonly websiteFetchAdapter: WebsiteFetchAdapter,
    private readonly classifier: WebsiteStatusClassifier,
    private readonly leadsService: LeadsService,
    private readonly costService: CostService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(REDIS_CACHE) private readonly cache: RedisCacheService,
  ) {}

  async run(params: DiscoveryRunParams): Promise<void> {
    await this.prisma.discoveryJob.update({
      where: { id: params.discoveryJobId },
      data: { status: DiscoveryJobStatus.RUNNING },
    });

    try {
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
            `Discovery job ${params.discoveryJobId}: failed processing candidate ${candidate.placeId}`,
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

  private async searchCandidates(params: DiscoveryRunParams): Promise<PlacesCandidate[]> {
    const cacheKey = `discovery:${params.city}:${params.category}`;
    return this.cache.getOrSetJson(cacheKey, SEARCH_CACHE_TTL_SECONDS, async () => {
      await this.costService.assertWithinBudget();
      const candidates = await this.placesAdapter.searchText(params);
      await this.costService.recordCost('google_places_search', PLACES_SEARCH_COST_USD, {
        city: params.city,
        category: params.category,
      });
      return candidates;
    });
  }

  /** Returns true if this candidate ended up qualifying (persisted as none/outdated). */
  private async processCandidate(
    candidate: PlacesCandidate,
    params: DiscoveryRunParams,
  ): Promise<boolean> {
    const { websiteUri, status } = await this.classifyWebsite(candidate.placeId);
    const prismaStatus = toPrismaWebsiteStatus(status);

    if (prismaStatus === PrismaWebsiteStatus.PRESENT) {
      // A brand-new `present` candidate is discarded (FR-1.3). An
      // already-tracked lead that's now `present` still gets refreshed so
      // the CRM reflects reality (FR-1.7) — it just doesn't pay for the
      // full-details tier, since we're not going to pitch it either way.
      const alreadyTracked = await this.leadsService.existsByPlaceId(candidate.placeId);
      if (!alreadyTracked) {
        return false;
      }

      await this.leadsService.upsertByPlaceId({
        googlePlaceId: candidate.placeId,
        businessName: candidate.displayName,
        category: params.category,
        city: params.city,
        address: candidate.formattedAddress,
        placesData: { candidate, websiteUri } as unknown as Prisma.InputJsonValue,
        websiteStatus: prismaStatus,
        discoveryJobId: params.discoveryJobId,
      });
      return false; // refreshed, but not a new qualifying result for this job's count
    }

    await this.costService.assertWithinBudget();
    const fullDetails = await this.placesAdapter.getFullDetails(candidate.placeId);
    await this.costService.recordCost('google_places_details_full', PLACES_FULL_DETAILS_COST_USD, {
      placeId: candidate.placeId,
    });

    await this.leadsService.upsertByPlaceId({
      googlePlaceId: candidate.placeId,
      businessName: candidate.displayName,
      category: params.category,
      city: params.city,
      address: candidate.formattedAddress,
      placesData: { candidate, websiteUri, fullDetails } as unknown as Prisma.InputJsonValue,
      websiteStatus: prismaStatus,
      discoveryJobId: params.discoveryJobId,
    });

    return true;
  }

  /**
   * Cheap-tier website check + heuristic/AI classification, cached as one
   * unit per place_id (Doc 22 §13) — a cache hit skips both the Places
   * Details call *and* the site fetch/classification entirely, not just
   * the classification result.
   */
  private async classifyWebsite(placeId: string): Promise<WebsiteClassificationResult> {
    const cacheKey = `website-check:${placeId}`;
    const cached = await this.cache.getJson<WebsiteClassificationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    await this.costService.assertWithinBudget();
    const websiteUri = await this.placesAdapter.getWebsiteUri(placeId);
    await this.costService.recordCost(
      'google_places_details_cheap',
      PLACES_WEBSITE_CHECK_COST_USD,
      {
        placeId,
      },
    );

    let status: WebsiteStatus;
    if (!websiteUri) {
      status = 'none';
    } else {
      const fetchResult = await this.websiteFetchAdapter.fetch(websiteUri);
      const classification = await this.classifier.classify(fetchResult);
      status = classification.status;
    }

    const result: WebsiteClassificationResult = { websiteUri, status };
    await this.cache.setJson(cacheKey, result, WEBSITE_CHECK_CACHE_TTL_SECONDS);
    return result;
  }
}
