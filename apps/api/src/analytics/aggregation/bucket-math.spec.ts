import {
  bucketBounds,
  bucketKeyFor,
  enumerateBucketKeys,
  granularityForSpan,
  MS_PER_DAY,
} from './bucket-math';

describe('bucketKeyFor / bucketBounds round-trip', () => {
  const sampleDates = [
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-03-15T12:34:56.000Z'),
    new Date('2026-08-07T23:59:59.999Z'),
    new Date('2026-12-31T00:00:00.001Z'),
  ];

  it.each(['daily', 'weekly', 'monthly', 'yearly'] as const)(
    "a date's %s bucket bounds always contain that date",
    (period) => {
      for (const date of sampleDates) {
        const key = bucketKeyFor(date, period);
        const { start, end } = bucketBounds(key, period);
        expect(start.getTime()).toBeLessThanOrEqual(date.getTime());
        expect(end.getTime()).toBeGreaterThanOrEqual(date.getTime());
      }
    },
  );

  it('daily bucket spans exactly one calendar day (UTC)', () => {
    const { start, end } = bucketBounds('2026-08-07', 'daily');
    expect(start.toISOString()).toBe('2026-08-07T00:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(MS_PER_DAY - 1);
  });

  it('monthly bucket spans the full calendar month, including a 31-day month', () => {
    const { start, end } = bucketBounds('2026-08', 'monthly');
    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-31T23:59:59.999Z');
  });

  it('yearly bucket spans the full calendar year', () => {
    const { start, end } = bucketBounds('2026', 'yearly');
    expect(start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-31T23:59:59.999Z');
  });

  it('weekly bucket always starts on a Monday and spans exactly 7 days', () => {
    const key = bucketKeyFor(new Date('2026-08-07T00:00:00.000Z'), 'weekly');
    const { start, end } = bucketBounds(key, 'weekly');
    expect(start.getUTCDay()).toBe(1); // Monday
    expect(end.getTime() - start.getTime()).toBe(7 * MS_PER_DAY - 1);
  });
});

describe('enumerateBucketKeys', () => {
  it('returns exactly 3 daily buckets for a 3-day range', () => {
    const keys = enumerateBucketKeys(
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-03T23:59:59.999Z'),
      'daily',
    );
    expect(keys).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  it('returns exactly 3 monthly buckets for a Jan-Mar range', () => {
    const keys = enumerateBucketKeys(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      'monthly',
    );
    expect(keys).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('returns exactly 2 yearly buckets spanning a year boundary', () => {
    const keys = enumerateBucketKeys(
      new Date('2025-12-01T00:00:00.000Z'),
      new Date('2026-01-31T00:00:00.000Z'),
      'yearly',
    );
    expect(keys).toEqual(['2025', '2026']);
  });

  it('caps at a bounded number of buckets for a pathologically large range, never looping forever', () => {
    const keys = enumerateBucketKeys(
      new Date('1990-01-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
      'daily',
    );
    expect(keys.length).toBeLessThanOrEqual(3700);
  });
});

describe('granularityForSpan', () => {
  it('picks daily for a span under 31 days', () => {
    expect(
      granularityForSpan(
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-10T00:00:00.000Z'),
      ),
    ).toBe('daily');
  });

  it('picks weekly for a span between 31 and 180 days', () => {
    expect(
      granularityForSpan(
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-03-01T00:00:00.000Z'),
      ),
    ).toBe('weekly');
  });

  it('picks monthly for a span between 180 and 730 days', () => {
    expect(
      granularityForSpan(
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    ).toBe('monthly');
  });

  it('picks yearly for a span over 730 days', () => {
    expect(
      granularityForSpan(
        new Date('2015-01-01T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    ).toBe('yearly');
  });
});
