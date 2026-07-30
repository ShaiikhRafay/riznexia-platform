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
// every accepted charge is durably logged to `cost_event` for the eventual
// cost dashboard (Doc 17 §14) — the two together match Doc 22 §12/§3.
@Injectable()
export class CostService {
  private readonly logger = new Logger(CostService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(REDIS_CACHE) private readonly cache: RedisCacheService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Atomically reserves `costUsd` against the monthly ceiling and, if
   * accepted, durably logs it. Callers must call this *before* making the
   * external API call it corresponds to, not after — reserving first is
   * what makes this safe under concurrency.
   *
   * Previously this was two separate calls (`assertWithinBudget()` then
   * `recordCost()` after the external call succeeded), which had a
   * check-then-act race: two concurrent requests could both read a
   * still-under-ceiling total and both proceed, together overshooting the
   * ceiling by up to a full request's worth. Redis's INCRBY is atomic, so
   * incrementing first and deciding from the *post-increment* total closes
   * that race — at most one request can ever be the one that crosses the
   * line, and it's rejected (and its charge refunded) rather than silently
   * let through.
   */
  async charge(
    eventType: string,
    costUsd: number,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    const ceiling = this.ceilingUsd();
    const key = this.monthlyKey();
    const newTotal = await this.cache.incrementCounter(key, costUsd, secondsUntilNextUtcMonth());

    if (newTotal > ceiling) {
      // Compensate — back out this charge so a rejected call doesn't
      // permanently inflate the counter beyond what was actually spent.
      await this.cache.incrementCounter(key, -costUsd, secondsUntilNextUtcMonth());
      throw new QuotaExceededException(
        `Monthly cost ceiling of $${ceiling.toFixed(2)} reached — this $${costUsd.toFixed(4)} operation was not charged`,
      );
    }

    await this.prisma.costEvent.create({ data: { eventType, costUsd, metadata } });

    if (newTotal >= ceiling * QUOTA_WARNING_THRESHOLD) {
      this.logger.warn(
        `Monthly cost approaching ceiling: $${newTotal.toFixed(2)} / $${ceiling.toFixed(2)}`,
      );
    }
  }

  /** Read-only check, e.g. for a pre-flight UI warning — never used to gate a charge (see `charge`). */
  async currentSpend(): Promise<{ spent: number; ceiling: number }> {
    const spent = await this.cache.getCounter(this.monthlyKey());
    return { spent, ceiling: this.ceilingUsd() };
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
