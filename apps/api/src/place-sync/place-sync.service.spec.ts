import { BusinessSourceProvider, PlaceSyncJobStatus } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import {
  PlaceSyncJobNotFoundException,
  QuotaExceededException,
} from '../common/exceptions/app.exception';
import type { CostService } from '../common/cost/cost.service';
import type { PlaceSyncRunnerService } from './place-sync-runner.service';
import { PlaceSyncService } from './place-sync.service';

function fakeJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'job-1',
    createdById: 'user-1',
    provider: BusinessSourceProvider.GOOGLE,
    city: 'Karachi',
    category: 'restaurant',
    keyword: null,
    latitude: null,
    longitude: null,
    radiusMeters: 15000,
    status: PlaceSyncJobStatus.QUEUED,
    startedAt: null,
    finishedAt: null,
    duration: null,
    successRate: null,
    apiCallsUsed: 0,
    estimatedCost: 0,
    businessesFound: 0,
    businessesCreated: 0,
    businessesUpdated: 0,
    businessesFailed: 0,
    errorMessage: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('PlaceSyncService', () => {
  let prisma: { placeSyncJob: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock } };
  let costService: { currentSpend: jest.Mock };
  let runner: { run: jest.Mock };
  let service: PlaceSyncService;

  beforeEach(() => {
    prisma = {
      placeSyncJob: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    };
    costService = { currentSpend: jest.fn().mockResolvedValue({ spent: 10, ceiling: 300 }) };
    runner = { run: jest.fn().mockResolvedValue(undefined) };
    service = new PlaceSyncService(
      prisma as unknown as PrismaClient,
      costService as unknown as CostService,
      runner as unknown as PlaceSyncRunnerService,
    );
  });

  describe('createJob', () => {
    const input = { city: 'Karachi', category: 'restaurant', radiusMeters: 15000 };

    it('creates a QUEUED job row and dispatches the runner fire-and-forget', async () => {
      prisma.placeSyncJob.create.mockResolvedValue(fakeJob());

      const result = await service.createJob(input, 'user-1');

      expect(prisma.placeSyncJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdById: 'user-1',
          provider: BusinessSourceProvider.GOOGLE,
          city: 'Karachi',
          status: PlaceSyncJobStatus.QUEUED,
        }),
      });
      expect(result).toMatchObject({ id: 'job-1', status: 'queued' });
    });

    it('dispatches the runner without awaiting it (fire-and-forget)', async () => {
      prisma.placeSyncJob.create.mockResolvedValue(fakeJob());
      let resolveRun: () => void = () => {};
      runner.run.mockReturnValue(new Promise<void>((resolve) => (resolveRun = resolve)));

      await service.createJob(input, 'user-1');

      expect(runner.run).toHaveBeenCalledWith(
        expect.objectContaining({ placeSyncJobId: 'job-1', city: 'Karachi' }),
      );
      resolveRun();
    });

    it('throws QuotaExceededException before creating a job when already over the monthly ceiling', async () => {
      costService.currentSpend.mockResolvedValue({ spent: 300, ceiling: 300 });

      await expect(service.createJob(input, 'user-1')).rejects.toBeInstanceOf(
        QuotaExceededException,
      );
      expect(prisma.placeSyncJob.create).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    it('returns jobs ordered by newest first, mapped to the API shape', async () => {
      prisma.placeSyncJob.findMany.mockResolvedValue([fakeJob()]);
      const result = await service.findMany();
      expect(result).toHaveLength(1);
      expect(prisma.placeSyncJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('findById', () => {
    it('returns the mapped job when found', async () => {
      prisma.placeSyncJob.findUnique.mockResolvedValue(fakeJob());
      const result = await service.findById('job-1');
      expect(result).toMatchObject({ id: 'job-1' });
    });

    it('throws PlaceSyncJobNotFoundException when missing', async () => {
      prisma.placeSyncJob.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        PlaceSyncJobNotFoundException,
      );
    });
  });
});
