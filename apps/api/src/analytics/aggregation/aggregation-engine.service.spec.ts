import { InvalidAggregationRangeException } from '../../common/exceptions/app.exception';
import { AggregationEngineService } from './aggregation-engine.service';

describe('AggregationEngineService', () => {
  let service: AggregationEngineService;

  beforeEach(() => {
    service = new AggregationEngineService();
  });

  describe('resolveRange', () => {
    it('throws InvalidAggregationRangeException when period=custom and dates are missing', () => {
      expect(() => service.resolveRange({ period: 'custom' })).toThrow(
        InvalidAggregationRangeException,
      );
    });

    it('throws InvalidAggregationRangeException when period=custom and fromDate is not before toDate', () => {
      expect(() =>
        service.resolveRange({
          period: 'custom',
          fromDate: '2026-08-10T00:00:00.000Z',
          toDate: '2026-08-01T00:00:00.000Z',
        }),
      ).toThrow(InvalidAggregationRangeException);
    });

    it('accepts a well-formed custom range', () => {
      const range = service.resolveRange({
        period: 'custom',
        fromDate: '2026-08-01T00:00:00.000Z',
        toDate: '2026-08-10T00:00:00.000Z',
      });
      expect(range.from.toISOString()).toBe('2026-08-01T00:00:00.000Z');
      expect(range.to.toISOString()).toBe('2026-08-10T00:00:00.000Z');
    });

    it('defaults to a 30-day lookback for period=daily with no explicit fromDate', () => {
      const toDate = '2026-08-31T00:00:00.000Z';
      const range = service.resolveRange({ period: 'daily', toDate });
      expect(range.to.toISOString()).toBe(toDate);
      expect(range.from.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    });

    it('honors an explicit fromDate for a non-custom period', () => {
      const range = service.resolveRange({
        period: 'monthly',
        fromDate: '2026-01-01T00:00:00.000Z',
        toDate: '2026-06-01T00:00:00.000Z',
      });
      expect(range.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('bucketize', () => {
    it('sums row values into their matching daily buckets, filling empty buckets with 0', () => {
      const rows = [
        { date: new Date('2026-08-01T10:00:00.000Z'), amount: 5 },
        { date: new Date('2026-08-01T15:00:00.000Z'), amount: 3 },
        { date: new Date('2026-08-03T00:00:00.000Z'), amount: 7 },
      ];

      const buckets = service.bucketize(
        rows,
        (r) => r.date,
        (r) => r.amount,
        'daily',
        { from: new Date('2026-08-01T00:00:00.000Z'), to: new Date('2026-08-03T23:59:59.999Z') },
      );

      expect(buckets).toHaveLength(3);
      expect(buckets[0]).toMatchObject({ value: 8 });
      expect(buckets[1]).toMatchObject({ value: 0 });
      expect(buckets[2]).toMatchObject({ value: 7 });
    });

    it('excludes rows outside the given range', () => {
      const rows = [
        { date: new Date('2026-07-31T23:59:59.999Z'), amount: 100 },
        { date: new Date('2026-08-01T00:00:00.000Z'), amount: 5 },
      ];
      const buckets = service.bucketize(
        rows,
        (r) => r.date,
        (r) => r.amount,
        'daily',
        { from: new Date('2026-08-01T00:00:00.000Z'), to: new Date('2026-08-01T23:59:59.999Z') },
      );
      expect(buckets).toHaveLength(1);
      expect(buckets[0]?.value).toBe(5);
    });

    it('picks an auto granularity for period=custom based on span', () => {
      const rows = [{ date: new Date('2026-08-05T00:00:00.000Z'), amount: 1 }];
      const buckets = service.bucketize(
        rows,
        (r) => r.date,
        (r) => r.amount,
        'custom',
        { from: new Date('2026-08-01T00:00:00.000Z'), to: new Date('2026-08-10T00:00:00.000Z') },
      );
      // A 9-day span auto-picks daily granularity -> ~10 buckets, not 1.
      expect(buckets.length).toBeGreaterThan(1);
    });
  });
});
