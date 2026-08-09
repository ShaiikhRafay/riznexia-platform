import { z } from 'zod';
import { AGGREGATION_PERIODS, timeSeriesBucketSchema } from './analytics-aggregation';
import { dashboardStatsSchema } from './dashboard-stats';

// Module M12 — the fifteen named reports from the founder's brief. A
// closed taxonomy, same discipline as every other one in this package —
// a future report is a deliberate, additive schema change (new value +
// new data shape + one new ReportingEngineService method), never a
// silently-accepted new string.
export const REPORT_TYPES = [
  'lead_funnel',
  'conversion_rate',
  'sales_performance',
  'ai_cost',
  'ai_usage',
  'deployment',
  'website_generation',
  'theme_usage',
  'business_category',
  'industry',
  'error',
  'health',
  'user_activity',
  'audit',
  'executive_dashboard',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// Used to validate the `:type` route param directly via ZodValidationPipe
// (which accepts any ZodSchema, not just object schemas).
export const reportTypeSchema = z.enum(REPORT_TYPES);

const countBreakdownSchema = z.object({
  label: z.string(),
  count: z.number().int().nonnegative(),
});

// ---------- Per-report data shapes ----------

export const leadFunnelReportSchema = z.object({
  stages: z.array(
    z.object({
      stageKey: z.string(),
      stageName: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  totalLeads: z.number().int().nonnegative(),
});
export type LeadFunnelReport = z.infer<typeof leadFunnelReportSchema>;

export const conversionRateReportSchema = z.object({
  overallRatePercent: z.number().min(0).max(100).nullable(),
  byPeriod: z.array(timeSeriesBucketSchema),
});
export type ConversionRateReport = z.infer<typeof conversionRateReportSchema>;

// Sales Performance is a direct passthrough of M10's own DashboardStats —
// never re-derived (founder's explicit Decision 2).
export const salesPerformanceReportSchema = dashboardStatsSchema;
export type SalesPerformanceReport = z.infer<typeof salesPerformanceReportSchema>;

export const aiCostReportSchema = z.object({
  totalCostUsd: z.number().nonnegative(),
  byEventType: z.array(
    z.object({
      eventType: z.string(),
      costUsd: z.number().nonnegative(),
      count: z.number().int().nonnegative(),
    }),
  ),
  byPeriod: z.array(timeSeriesBucketSchema),
  currentMonthSpendUsd: z.number().nonnegative(),
  monthlyCeilingUsd: z.number().positive(),
});
export type AiCostReport = z.infer<typeof aiCostReportSchema>;

export const aiUsageReportSchema = z.object({
  totalAnalyses: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  byModel: z.array(
    z.object({
      aiModel: z.string(),
      count: z.number().int().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
    }),
  ),
  byStatus: z.array(countBreakdownSchema),
  averageExecutionTimeMs: z.number().nonnegative().nullable(),
});
export type AiUsageReport = z.infer<typeof aiUsageReportSchema>;

export const deploymentReportSchema = z.object({
  totalDeployments: z.number().int().nonnegative(),
  byStatus: z.array(countBreakdownSchema),
  byProvider: z.array(countBreakdownSchema),
  successRatePercent: z.number().min(0).max(100).nullable(),
  averageExecutionDurationMs: z.number().nonnegative().nullable(),
});
export type DeploymentReport = z.infer<typeof deploymentReportSchema>;

export const websiteGenerationReportSchema = z.object({
  totalGenerated: z.number().int().nonnegative(),
  byPeriod: z.array(timeSeriesBucketSchema),
  averagePublishReadinessScore: z.number().nonnegative().nullable(),
});
export type WebsiteGenerationReport = z.infer<typeof websiteGenerationReportSchema>;

export const themeUsageReportSchema = z.object({
  byTheme: z.array(
    z.object({ themeId: z.string(), themeName: z.string(), count: z.number().int().nonnegative() }),
  ),
});
export type ThemeUsageReport = z.infer<typeof themeUsageReportSchema>;

export const businessCategoryReportSchema = z.object({
  byCategory: z.array(countBreakdownSchema),
});
export type BusinessCategoryReport = z.infer<typeof businessCategoryReportSchema>;

// Distinct from Business Category (raw distribution): ties each category
// to CRM outcomes, so it answers "which industries actually convert" —
// not just "how many leads come from each industry."
export const industryReportSchema = z.object({
  byCategory: z.array(
    z.object({
      category: z.string(),
      leadCount: z.number().int().nonnegative(),
      wonCount: z.number().int().nonnegative(),
      totalDealValueUsd: z.number().nonnegative(),
    }),
  ),
});
export type IndustryReport = z.infer<typeof industryReportSchema>;

export const errorReportSchema = z.object({
  totalErrors: z.number().int().nonnegative(),
  byModule: z.array(
    z.object({
      module: z.string(),
      failedCount: z.number().int().nonnegative(),
      sampleMessages: z.array(z.string()),
    }),
  ),
});
export type ErrorReport = z.infer<typeof errorReportSchema>;

export const healthReportSchema = z.object({
  costCeiling: z.object({
    spentUsd: z.number().nonnegative(),
    ceilingUsd: z.number().positive(),
    percentUsed: z.number().nonnegative(),
  }),
  deploymentHealth: z.object({
    healthy: z.number().int().nonnegative(),
    unhealthy: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
  }),
  recentFailureCount: z.number().int().nonnegative(),
});
export type HealthReport = z.infer<typeof healthReportSchema>;

export const userActivityReportSchema = z.object({
  byActor: z.array(
    z.object({
      actorId: z.string().uuid().nullable(),
      actorName: z.string().nullable(),
      actionCount: z.number().int().nonnegative(),
      lastActiveAt: z.string().datetime().nullable(),
    }),
  ),
});
export type UserActivityReport = z.infer<typeof userActivityReportSchema>;

export const auditReportEntrySchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  createdAt: z.string().datetime(),
});
export const auditReportSchema = z.object({
  items: z.array(auditReportEntrySchema),
  nextCursor: z.string().nullable(),
});
export type AuditReport = z.infer<typeof auditReportSchema>;

// The Executive Dashboard report is deliberately the same composed data
// the live dashboard renders — an export of it, not a second
// implementation (founder's explicit Decision 6).
export const executiveDashboardReportSchema = z.record(z.unknown());
export type ExecutiveDashboardReport = z.infer<typeof executiveDashboardReportSchema>;

// ---------- Envelope ----------

export const analyticsReportQuerySchema = z.object({
  period: z.enum(AGGREGATION_PERIODS).default('monthly'),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type AnalyticsReportQuery = z.infer<typeof analyticsReportQuerySchema>;

export const analyticsReportEnvelopeSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  generatedAt: z.string().datetime(),
  period: z.enum(AGGREGATION_PERIODS),
  filters: z.object({
    fromDate: z.string().datetime().nullable(),
    toDate: z.string().datetime().nullable(),
  }),
  data: z.unknown(),
});
export type AnalyticsReportEnvelope = z.infer<typeof analyticsReportEnvelopeSchema>;
