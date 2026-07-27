import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, PrismaClient } from '@riznexia/db';
import type { RedisCacheService } from '@riznexia/cache';
import { REDIS_CACHE } from '../cache/cache.constants';
import { PRISMA_CLIENT } from '../database/database.constants';
import { QuotaExceededException } from '../exceptions/app.exception';
import { DEFAULT_MONTHLY_COST_CEILING_USD, QUOTA_WARNING_THRESHOLD } from './cost.constants';

// Org-wide cost governance (Doc 04 §10, BRD BR-7): a fast Redis-backed
// running total gates every cost-incurring request before it starts, and
// every actual call is durably logged to `cost_event` for the eventual
// cost dashboard (Doc 17 §14) — the two together match Doc 22 §12/§3.
@Injectable()
export class CostService {
  private readonly logger = new Logger(CostService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(REDIS_CACHE) private readonly cache: RedisCacheService,
    private readonly config: ConfigService,
  ) {}

  /** Call before starting any cost-incurring operation (Doc 22 §5/§6). */
  async assertWithinBudget(): Promise<void> {
    const spent = await this.cache.getCounter(this.monthlyKey());
    const ceiling = this.ceilingUsd();
    if (spent >= ceiling) {
      throw new QuotaExceededException(
        `Monthly cost ceiling of $${ceiling.toFixed(2)} reached ($${spent.toFixed(2)} already spent this month)`,
      );
    }
  }

  /** Durably logs the cost and updates the fast running-total counter. */
  async recordCost(
    eventType: string,
    costUsd: number,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.costEvent.create({
      data: { eventType, costUsd, metadata },
    });

    const newTotal = await this.cache.incrementCounter(
      this.monthlyKey(),
      costUsd,
      secondsUntilNextUtcMonth(),
    );

    const ceiling = this.ceilingUsd();
    if (newTotal >= ceiling * QUOTA_WARNING_THRESHOLD) {
      this.logger.warn(
        `Monthly cost approaching ceiling: $${newTotal.toFixed(2)} / $${ceiling.toFixed(2)}`,
      );
    }
  }

  private ceilingUsd(): number {
    return this.config.get<number>('MONTHLY_COST_CEILING_USD') ?? DEFAULT_MONTHLY_COST_CEILING_USD;
  }

  private monthlyKey(): string {
    const now = new Date();
    return `cost:monthly:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
  }
}

function secondsUntilNextUtcMonth(): number {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
}
