import { Injectable, Logger } from '@nestjs/common';
import type { AggregationPeriod, TimeSeriesBucket } from '@riznexia/shared-types';
import { InvalidAggregationRangeException } from '../../common/exceptions/app.exception';
import {
  bucketBounds,
  bucketKeyFor,
  enumerateBucketKeys,
  granularityForSpan,
  MS_PER_DAY,
} from './bucket-math';

export interface AggregationRange {
  from: Date;
  to: Date;
}

interface AggregationRangeQuery {
  period: AggregationPeriod;
  fromDate?: string;
  toDate?: string;
}

// Default lookback when a non-custom period is requested with no explicit
// `fromDate` — enough history for a meaningful trend without scanning a
// business's entire lifetime by default (founder's explicit Decision 10:
// "avoid unnecessary database scans").
const DEFAULT_LOOKBACK_DAYS: Record<Exclude<AggregationPeriod, 'custom'>, number> = {
  daily: 30,
  weekly: 84,
  monthly: 365,
  yearly: 1825,
};

// Module M12 (DECISIONS.md D-107) — the Aggregation Engine. Founder's
// explicit Decision 5: "All reports and dashboards must consume this
// engine" — every trend-shaped report/widget bucketing goes through
// `bucketize()`, never a bespoke date-grouping written inline elsewhere.
@Injectable()
export class AggregationEngineService {
  private readonly logger = new Logger(AggregationEngineService.name);

  resolveRange(query: AggregationRangeQuery): AggregationRange {
    if (query.period === 'custom') {
      if (!query.fromDate || !query.toDate) {
        throw new InvalidAggregationRangeException();
      }
      const from = new Date(query.fromDate);
      const to = new Date(query.toDate);
      if (
        Number.isNaN(from.getTime()) ||
        Number.isNaN(to.getTime()) ||
        from.getTime() >= to.getTime()
      ) {
        throw new InvalidAggregationRangeException();
      }
      return { from, to };
    }

    const to = query.toDate ? new Date(query.toDate) : new Date();
    if (query.fromDate) {
      return { from: new Date(query.fromDate), to };
    }
    const lookbackDays = DEFAULT_LOOKBACK_DAYS[query.period];
    return { from: new Date(to.getTime() - lookbackDays * MS_PER_DAY), to };
  }

  /**
   * Buckets `rows` into a chronological time series covering every bucket
   * in `range`, including empty ones (value 0) — a trend chart needs
   * gaps represented, not silently skipped.
   */
  bucketize<T>(
    rows: T[],
    getDate: (row: T) => Date,
    getValue: (row: T) => number,
    period: AggregationPeriod,
    range: AggregationRange,
  ): TimeSeriesBucket[] {
    const effectivePeriod = period === 'custom' ? granularityForSpan(range.from, range.to) : period;

    const sums = new Map<string, number>();
    for (const row of rows) {
      const date = getDate(row);
      if (date.getTime() < range.from.getTime() || date.getTime() > range.to.getTime()) {
        continue;
      }
      const key = bucketKeyFor(date, effectivePeriod);
      sums.set(key, (sums.get(key) ?? 0) + getValue(row));
    }

    const buckets = enumerateBucketKeys(range.from, range.to, effectivePeriod).map((key) => {
      const { start, end } = bucketBounds(key, effectivePeriod);
      return {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        value: sums.get(key) ?? 0,
      };
    });

    this.logger.log(
      `Aggregation Completed: period=${period}, buckets=${buckets.length}, rows=${rows.length}`,
    );
    return buckets;
  }
}
