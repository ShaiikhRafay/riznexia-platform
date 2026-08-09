import { describe, expect, it } from 'vitest';
import { aggregationQuerySchema, timeSeriesBucketSchema } from './analytics-aggregation';

describe('timeSeriesBucketSchema', () => {
  it('accepts a valid bucket', () => {
    expect(
      timeSeriesBucketSchema.safeParse({
        periodStart: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        periodEnd: new Date('2026-01-31T23:59:59.000Z').toISOString(),
        value: 42,
      }).success,
    ).toBe(true);
  });
});

describe('aggregationQuerySchema', () => {
  it('defaults period to monthly when omitted', () => {
    const result = aggregationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.success && result.data.period).toBe('monthly');
  });

  it('accepts every period value', () => {
    for (const period of ['daily', 'weekly', 'monthly', 'yearly', 'custom']) {
      expect(aggregationQuerySchema.safeParse({ period }).success).toBe(true);
    }
  });

  it('rejects an unknown period', () => {
    expect(aggregationQuerySchema.safeParse({ period: 'hourly' }).success).toBe(false);
  });

  it('accepts a custom range with fromDate/toDate', () => {
    expect(
      aggregationQuerySchema.safeParse({
        period: 'custom',
        fromDate: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        toDate: new Date('2026-02-01T00:00:00.000Z').toISOString(),
      }).success,
    ).toBe(true);
  });
});
