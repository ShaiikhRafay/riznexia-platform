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

  describe('currentSpend', () => {
    it('returns the current counter value and ceiling', async () => {
      cache.getCounter.mockResolvedValue(120);
      await expect(service.currentSpend()).resolves.toEqual({ spent: 120, ceiling: 300 });
    });

    it('respects a configured MONTHLY_COST_CEILING_USD override', async () => {
      config.get.mockReturnValue(50);
      cache.getCounter.mockResolvedValue(10);
      await expect(service.currentSpend()).resolves.toEqual({ spent: 10, ceiling: 50 });
    });
  });

  describe('charge', () => {
    it('increments the counter atomically before checking the ceiling (reserve-first)', async () => {
      cache.incrementCounter.mockResolvedValue(10);
      await service.charge('google_places_search', 0.032);
      expect(cache.incrementCounter).toHaveBeenCalledWith(
        expect.stringMatching(/^cost:monthly:\d{4}-\d{1,2}$/),
        0.032,
        expect.any(Number),
      );
    });

    it('writes a durable cost_event row when the charge is accepted', async () => {
      cache.incrementCounter.mockResolvedValue(10);
      await service.charge('google_places_search', 0.032, { city: 'Karachi' });
      expect(prisma.costEvent.create).toHaveBeenCalledWith({
        data: { eventType: 'google_places_search', costUsd: 0.032, metadata: { city: 'Karachi' } },
      });
    });

    it('rejects and refunds the charge when the post-increment total exceeds the ceiling', async () => {
      cache.incrementCounter.mockResolvedValueOnce(300.032); // over the $300 default

      await expect(service.charge('google_places_search', 0.032)).rejects.toBeInstanceOf(
        QuotaExceededException,
      );

      // compensating decrement issued, and no durable row written for a rejected charge
      expect(cache.incrementCounter).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/^cost:monthly:/),
        -0.032,
        expect.any(Number),
      );
      expect(prisma.costEvent.create).not.toHaveBeenCalled();
    });

    it('accepts a charge that lands exactly at the ceiling', async () => {
      cache.incrementCounter.mockResolvedValue(300);
      await expect(service.charge('google_places_search', 0.032)).resolves.toBeUndefined();
      expect(prisma.costEvent.create).toHaveBeenCalled();
    });

    it('respects a configured lower ceiling when rejecting', async () => {
      config.get.mockReturnValue(50);
      cache.incrementCounter.mockResolvedValue(50.01);
      await expect(service.charge('google_places_search', 0.01)).rejects.toBeInstanceOf(
        QuotaExceededException,
      );
    });

    it('logs a warning once spend crosses the 80% threshold but does not throw', async () => {
      cache.incrementCounter.mockResolvedValue(250); // 250/300 = 83%
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      await expect(service.charge('google_places_search', 0.032)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('does not log a warning under the 80% threshold', async () => {
      cache.incrementCounter.mockResolvedValue(100);
      const warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      await service.charge('google_places_search', 0.032);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
