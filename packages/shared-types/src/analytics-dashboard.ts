import { z } from 'zod';
import { AGGREGATION_PERIODS } from './analytics-aggregation';

// Module M12 (DECISIONS.md D-108) — the eight founder-named dashboard
// widgets. Each is a lean summary slice of a Reporting Engine report, not
// independently computed business logic (founder's explicit Decision 6:
// "Dashboard widgets must be composed from existing analytics. Do not
// implement separate business logic for dashboards.").
export const dashboardWidgetsSchema = z.object({
  leads: z.object({ totalLeads: z.number().int().nonnegative() }),
  sales: z.object({
    totalPipelineValueUsd: z.number().nonnegative(),
    winRatePercent: z.number().min(0).max(100).nullable(),
  }),
  aiUsage: z.object({
    totalAnalyses: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
  }),
  costs: z.object({
    spentUsd: z.number().nonnegative(),
    ceilingUsd: z.number().positive(),
    percentUsed: z.number().nonnegative(),
  }),
  deployments: z.object({
    totalDeployments: z.number().int().nonnegative(),
    successRatePercent: z.number().min(0).max(100).nullable(),
  }),
  websiteStatus: z.object({
    totalGenerated: z.number().int().nonnegative(),
    averagePublishReadinessScore: z.number().nonnegative().nullable(),
  }),
  conversion: z.object({ overallRatePercent: z.number().min(0).max(100).nullable() }),
  systemHealth: z.object({
    healthy: z.number().int().nonnegative(),
    unhealthy: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
  }),
});
export type DashboardWidgets = z.infer<typeof dashboardWidgetsSchema>;

export const analyticsDashboardSchema = z.object({
  generatedAt: z.string().datetime(),
  period: z.enum(AGGREGATION_PERIODS),
  widgets: dashboardWidgetsSchema,
});
export type AnalyticsDashboard = z.infer<typeof analyticsDashboardSchema>;

// Named distinctly from dashboard-stats.ts's `dashboardQuerySchema` (M10's
// CRM dashboard) to avoid a re-export collision in index.ts.
export const analyticsDashboardQuerySchema = z.object({
  period: z.enum(AGGREGATION_PERIODS).default('monthly'),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});
export type AnalyticsDashboardQuery = z.infer<typeof analyticsDashboardQuerySchema>;
