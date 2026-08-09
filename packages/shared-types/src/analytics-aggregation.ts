import { z } from 'zod';

// Module M12 (DECISIONS.md D-107) — the Aggregation Engine's closed set of
// bucket sizes. `custom` requires an explicit `fromDate`/`toDate` range;
// every other value buckets relative to "now" (or an optional range that
// merely bounds which buckets to return).
export const AGGREGATION_PERIODS = ['daily', 'weekly', 'monthly', 'yearly', 'custom'] as const;
export type AggregationPeriod = (typeof AGGREGATION_PERIODS)[number];

export const timeSeriesBucketSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  value: z.number(),
});
export type TimeSeriesBucket = z.infer<typeof timeSeriesBucketSchema>;

// Shared by every report/dashboard/export endpoint that accepts a time
// window (founder's explicit Decision 5: "All reports and dashboards must
// consume this engine"). `fromDate`/`toDate` are optional except when
// `period === 'custom'`, validated by the service layer (not the schema,
// since a cross-field conditional-required rule reads more clearly as an
// explicit runtime check than a `.refine()` a caller has to reverse-
// engineer from a generic Zod error).
export const aggregationQuerySchema = z.object({
  period: z.enum(AGGREGATION_PERIODS).default('monthly'),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});
export type AggregationQuery = z.infer<typeof aggregationQuerySchema>;
