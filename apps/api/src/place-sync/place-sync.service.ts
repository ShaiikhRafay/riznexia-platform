import { Inject, Injectable, Logger } from '@nestjs/common';
import { BusinessSourceProvider, PlaceSyncJobStatus } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { CreatePlaceSyncJobInput, PlaceSyncJob } from '@riznexia/shared-types';
import { CostService } from '../common/cost/cost.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  PlaceSyncJobNotFoundException,
  QuotaExceededException,
} from '../common/exceptions/app.exception';
import { toPlaceSyncJobResponse } from './dto/place-sync-job-response.dto';
import { PlaceSyncRunnerService } from './place-sync-runner.service';

// POST/GET /place-sync-jobs orchestration (Doc 21 M5 entry) — mirrors
// DiscoveryService's split (this service owns request handling, the job
// row, and dispatch; PlaceSyncRunnerService owns the actual sync pipeline),
// same rationale as Doc 22 §5/§8 for Module M1.
@Injectable()
export class PlaceSyncService {
  private readonly logger = new Logger(PlaceSyncService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly costService: CostService,
    private readonly runner: PlaceSyncRunnerService,
  ) {}

  async createJob(input: CreatePlaceSyncJobInput, createdById: string): Promise<PlaceSyncJob> {
    // Advisory only, same as DiscoveryService.createJobs — the real
    // enforcement is atomic and happens per-charge inside
    // PlaceSyncRunnerService (CostService.charge).
    const { spent, ceiling } = await this.costService.currentSpend();
    if (spent >= ceiling) {
      throw new QuotaExceededException(
        `Monthly cost ceiling of $${ceiling.toFixed(2)} reached ($${spent.toFixed(2)} already spent this month)`,
      );
    }

    const job = await this.prisma.placeSyncJob.create({
      data: {
        createdById,
        provider: BusinessSourceProvider.GOOGLE,
        city: input.city,
        category: input.category,
        keyword: input.keyword,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        status: PlaceSyncJobStatus.QUEUED,
      },
    });

    // DECISIONS.md D-004: in-process dispatch pending real Trigger.dev
    // wiring, same fire-and-forget pattern as DiscoveryService — the HTTP
    // response doesn't block on completion; run() manages its own status
    // transitions and per-candidate error handling.
    void this.runner
      .run({
        placeSyncJobId: job.id,
        city: job.city ?? undefined,
        category: job.category ?? undefined,
        keyword: job.keyword ?? undefined,
        latitude: job.latitude === null ? undefined : Number(job.latitude),
        longitude: job.longitude === null ? undefined : Number(job.longitude),
        radiusMeters: job.radiusMeters ?? undefined,
      })
      .catch((error: unknown) => {
        this.logger.error(`Unhandled error running place sync job ${job.id}`, error);
      });

    return toPlaceSyncJobResponse(job);
  }

  async findMany(): Promise<PlaceSyncJob[]> {
    const jobs = await this.prisma.placeSyncJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jobs.map(toPlaceSyncJobResponse);
  }

  async findById(id: string): Promise<PlaceSyncJob> {
    const job = await this.prisma.placeSyncJob.findUnique({ where: { id } });
    if (!job) {
      throw new PlaceSyncJobNotFoundException();
    }
    return toPlaceSyncJobResponse(job);
  }
}
