import { DiscoveryJobStatus } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import { NotFoundException } from '@nestjs/common';
import type { CostService } from '../common/cost/cost.service';
import { QuotaExceededException } from '../common/exceptions/app.exception';
import type { DiscoveryRunnerService } from './discovery-runner.service';
import { DiscoveryService } from './discovery.service';

describe('DiscoveryService', () => {
  let prisma: {
    discoveryJob: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let costService: { currentSpend: jest.Mock };
  let runner: { run: jest.Mock };
  let service: DiscoveryService;

  const fakeJobRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'job-1',
    city: 'Karachi',
    category: 'restaurant',
    status: DiscoveryJobStatus.QUEUED,
    resultsCount: 0,
    createdById: 'rep-1',
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      discoveryJob: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      // Prisma's batch $transaction([...]) takes an array of already-invoked
      // Prisma promises and resolves them together — Promise.all mirrors
      // that closely enough for unit-testing the calling code.
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    costService = { currentSpend: jest.fn().mockResolvedValue({ spent: 0, ceiling: 300 }) };
    runner = { run: jest.fn().mockResolvedValue(undefined) };
    service = new DiscoveryService(
      prisma as unknown as PrismaClient,
      costService as unknown as CostService,
      runner as unknown as DiscoveryRunnerService,
    );
  });

  describe('createJobs', () => {
    it('rejects up front when already at the cost ceiling, before creating any job rows', async () => {
      costService.currentSpend.mockResolvedValue({ spent: 300, ceiling: 300 });
      prisma.discoveryJob.create.mockResolvedValue(fakeJobRow());

      await expect(
        service.createJobs({ city: 'Karachi', categories: ['restaurant'], radiusKm: 15 }, 'rep-1'),
      ).rejects.toBeInstanceOf(QuotaExceededException);

      expect(prisma.discoveryJob.create).not.toHaveBeenCalled();
    });

    it('allows job creation when under the ceiling', async () => {
      costService.currentSpend.mockResolvedValue({ spent: 100, ceiling: 300 });
      prisma.discoveryJob.create.mockResolvedValue(fakeJobRow());

      await expect(
        service.createJobs({ city: 'Karachi', categories: ['restaurant'], radiusKm: 15 }, 'rep-1'),
      ).resolves.toBeDefined();
    });

    it('fans out one discovery_job row per requested category inside a single transaction', async () => {
      prisma.discoveryJob.create
        .mockResolvedValueOnce(fakeJobRow({ id: 'job-1', category: 'restaurant' }))
        .mockResolvedValueOnce(fakeJobRow({ id: 'job-2', category: 'cafe' }));

      const result = await service.createJobs(
        { city: 'Karachi', categories: ['restaurant', 'cafe'], radiusKm: 15 },
        'rep-1',
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.discoveryJob.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { id: 'job-1', city: 'Karachi', category: 'restaurant', status: 'queued', resultsCount: 0 },
        { id: 'job-2', city: 'Karachi', category: 'cafe', status: 'queued', resultsCount: 0 },
      ]);
    });

    it('dispatches the runner for every created job without waiting for it to finish', async () => {
      prisma.discoveryJob.create.mockResolvedValue(fakeJobRow());
      let resolveRun: () => void = () => {};
      runner.run.mockReturnValue(new Promise<void>((resolve) => (resolveRun = resolve)));

      const start = Date.now();
      await service.createJobs(
        { city: 'Karachi', categories: ['restaurant'], radiusKm: 15 },
        'rep-1',
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // did not block on the still-pending runner promise
      expect(runner.run).toHaveBeenCalledWith({
        discoveryJobId: 'job-1',
        city: 'Karachi',
        category: 'restaurant',
        radiusKm: 15,
      });
      resolveRun();
    });

    it('does not let an unhandled runner rejection escape (logged, not thrown)', async () => {
      prisma.discoveryJob.create.mockResolvedValue(fakeJobRow());
      runner.run.mockRejectedValue(new Error('boom'));

      await expect(
        service.createJobs({ city: 'Karachi', categories: ['restaurant'], radiusKm: 15 }, 'rep-1'),
      ).resolves.toBeDefined();
    });
  });

  describe('findMany', () => {
    it('maps rows to the API response shape', async () => {
      prisma.discoveryJob.findMany.mockResolvedValue([fakeJobRow()]);
      const result = await service.findMany();
      expect(result).toEqual([
        { id: 'job-1', city: 'Karachi', category: 'restaurant', status: 'queued', resultsCount: 0 },
      ]);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the job does not exist', async () => {
      prisma.discoveryJob.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the mapped job when found', async () => {
      prisma.discoveryJob.findUnique.mockResolvedValue(
        fakeJobRow({ status: DiscoveryJobStatus.COMPLETED, resultsCount: 5 }),
      );
      const result = await service.findById('job-1');
      expect(result).toEqual({
        id: 'job-1',
        city: 'Karachi',
        category: 'restaurant',
        status: 'completed',
        resultsCount: 5,
      });
    });
  });
});
