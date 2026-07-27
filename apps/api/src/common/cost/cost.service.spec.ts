import type { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@riznexia/db';
import type { RedisCacheService } from '@riznexia/cache';
import { QuotaExceededException } from '../exceptions/app.exception';
import { CostService } from './cost.service';

describe('CostService', () => {
  let prisma: { costEvent: { create: jest.Mock } };
  let cache: { getCounter: jest.Mock; incrementCounter: jest.Mock };
  let config: { get: jest.Mock };
  let service: CostService;

  beforeEach(() => {
    prisma = { costEvent: { create: jest.fn() } };
    cache = { getCounter: jest.fn(), incrementCounter: jest.fn() };
    config = { get: jest.fn().mockReturnValue(undefined) }; // use the $300 default
    service = new CostService(
      prisma as unknown as PrismaClient,
      cache as unknown as RedisCacheService,
      config as unknown as ConfigService,
    );
  });

  describe('assertWithinBudget', () => {
    it('does not throw when spend is under the ceiling', async () => {
      cache.getCounter.mockResolvedValue(100);
      await expect(service.assertWithinBudget()).resolves.toBeUndefined();
    });

    it('throws QuotaExceededException when spend has reached the ceiling', async () => {
      cache.getCounter.mockResolvedValue(300);
      await expect(service.assertWithinBudget()).rejects.toBeInstanceOf(QuotaExceededException);
    });

    it('throws when spend has exceeded the ceiling', async () => {
      cache.getCounter.mockResolvedValue(305);
      await expect(service.assertWithinBudget()).rejects.toBeInstanceOf(QuotaExceededException);
    });

    it('respects a configured MONTHLY_COST_CEILING_USD override', async () => {
      config.get.mockReturnValue(50);
      cache.getCounter.mockResolvedValue(60);
      await expect(service.assertWithinBudget()).rejects.toBeInstanceOf(QuotaExceededException);
    });

    it('does not throw just under a configured lower ceiling', async () => {
      config.get.mockReturnValue(50);
      cache.getCounter.mockResolvedValue(49);
      await expect(service.assertWithinBudget()).resolves.toBeUndefined();
    });
  });

  describe('recordCost', () => {
    it('writes a durable cost_event row', async () => {
      cache.incrementCounter.mockResolvedValue(10);
      await service.recordCost('google_places_search', 0.032, { city: 'Karachi' });
      expect(prisma.costEvent.create).toHaveBeenCalledWith({
        data: { eventType: 'google_places_search', costUsd: 0.032, metadata: { city: 'Karachi' } },
      });
    });

    it('increments the monthly Redis counter with a TTL until next UTC month', async () => {
      cache.incrementCounter.mockResolvedValue(10);
      await service.recordCost('google_places_search', 0.032);
      expect(cache.incrementCounter).toHaveBeenCalledWith(
        expect.stringMatching(/^cost:monthly:\d{4}-\d{1,2}$/),
        0.032,
        expect.any(Number),
      );
    });

    it('logs a warning once spend crosses the 80% threshold but does not throw', async () => {
      cache.incrementCounter.mockResolvedValue(250); // 250/300 = 83%
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      await expect(service.recordCost('google_places_search', 0.032)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('does not log a warning under the 80% threshold', async () => {
      cache.incrementCounter.mockResolvedValue(100);
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      await service.recordCost('google_places_search', 0.032);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
