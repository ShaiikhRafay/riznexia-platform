import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DiscoveryJobStatus } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { CreateDiscoveryJobInput, DiscoveryJob } from '@riznexia/shared-types';
import { CostService } from '../common/cost/cost.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { toDiscoveryJobResponse } from './dto/discovery-job-response.dto';
import { DiscoveryRunnerService } from './discovery-runner.service';

// POST/GET /discovery-jobs orchestration (Doc 22 §5/§8). Pipeline
// *execution* lives in DiscoveryRunnerService — this service owns request
// handling, the job rows, and dispatch, not the pipeline logic itself.
@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly costService: CostService,
    private readonly runner: DiscoveryRunnerService,
  ) {}

  /**
   * One request can request several categories (Doc 19 §5's request DTO);
   * Doc 18's discovery_job is one row per city+category pair, so this fans
   * out into one job per category — see the note in
   * packages/shared-types/src/discovery-job.ts.
   */
  async createJobs(input: CreateDiscoveryJobInput, createdById: string): Promise<DiscoveryJob[]> {
    await this.costService.assertWithinBudget();

    const jobs = await Promise.all(
      input.categories.map((category) =>
        this.prisma.discoveryJob.create({
          data: { city: input.city, category, createdById, status: DiscoveryJobStatus.QUEUED },
        }),
      ),
    );

    for (const job of jobs) {
      // DECISIONS.md D-004: in-process dispatch pending real Trigger.dev
      // wiring. Fire-and-forget — the HTTP response doesn't block on
      // completion (Doc 19 §5's async job pattern); run() manages its own
      // status transitions and per-job error handling.
      void this.runner
        .run({
          discoveryJobId: job.id,
          city: job.city,
          category: job.category,
          radiusKm: input.radiusKm,
        })
        .catch((error: unknown) => {
          this.logger.error(`Unhandled error running discovery job ${job.id}`, error);
        });
    }

    return jobs.map(toDiscoveryJobResponse);
  }

  async findMany(): Promise<DiscoveryJob[]> {
    const jobs = await this.prisma.discoveryJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jobs.map(toDiscoveryJobResponse);
  }

  async findById(id: string): Promise<DiscoveryJob> {
    const job = await this.prisma.discoveryJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Discovery job not found');
    }
    return toDiscoveryJobResponse(job);
  }
}
