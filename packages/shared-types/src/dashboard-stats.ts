import { z } from 'zod';

// Module M10 (DECISIONS.md D-086/D-089) — Reporting Engine. Founder's
// Decision 6: this shape only ever holds already-computed facts
// (aggregated/grouped/summed here, never derived here — every "what does
// this mean" question, e.g. "is this stage won", is answered by the
// Pipeline/Task/Proposal Engines, not re-derived from raw rows in this
// module). Founder's Decision 9: fully JSON-serializable, no live cursors
// or non-plain values, and a pure function of `(dateRange, filters)` —
// the shape a future cache wrapper (keyed on those same inputs) would
// sit in front of without needing a redesign; no caching is actually
// wired in this phase.
export const pipelineValueByStageSchema = z.object({
  stageId: z.string().uuid(),
  stageKey: z.string().min(1),
  stageName: z.string().min(1),
  leadCount: z.number().int().nonnegative(),
  totalValueUsd: z.number().nonnegative(),
});
export type PipelineValueByStage = z.infer<typeof pipelineValueByStageSchema>;

export const lostReasonBreakdownSchema = z.object({
  lostReasonId: z.string().uuid().nullable(),
  lostReasonLabel: z.string().nullable(),
  count: z.number().int().nonnegative(),
});
export type LostReasonBreakdown = z.infer<typeof lostReasonBreakdownSchema>;

export const salesPerformanceByRepSchema = z.object({
  ownerId: z.string().uuid().nullable(),
  ownerName: z.string().nullable(),
  openCount: z.number().int().nonnegative(),
  wonCount: z.number().int().nonnegative(),
  lostCount: z.number().int().nonnegative(),
  totalWonValueUsd: z.number().nonnegative(),
  averageSalesCycleDays: z.number().nonnegative().nullable(),
});
export type SalesPerformanceByRep = z.infer<typeof salesPerformanceByRepSchema>;

export const dashboardStatsSchema = z.object({
  generatedAt: z.string().datetime(),
  filters: z.object({
    fromDate: z.string().datetime().nullable(),
    toDate: z.string().datetime().nullable(),
    ownerId: z.string().uuid().nullable(),
  }),
  pipelineValueByStage: z.array(pipelineValueByStageSchema),
  totalPipelineValueUsd: z.number().nonnegative(),
  conversionRatePercent: z.number().min(0).max(100).nullable(),
  winRatePercent: z.number().min(0).max(100).nullable(),
  averageSalesCycleDays: z.number().nonnegative().nullable(),
  lostReasonsBreakdown: z.array(lostReasonBreakdownSchema),
  salesPerformanceByRep: z.array(salesPerformanceByRepSchema),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const dashboardQuerySchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  ownerId: z.string().uuid().optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
