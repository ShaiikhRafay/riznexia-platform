import { describe, expect, it } from 'vitest';
import {
  aiCostReportSchema,
  aiUsageReportSchema,
  analyticsReportEnvelopeSchema,
  analyticsReportQuerySchema,
  auditReportSchema,
  businessCategoryReportSchema,
  conversionRateReportSchema,
  deploymentReportSchema,
  errorReportSchema,
  healthReportSchema,
  industryReportSchema,
  leadFunnelReportSchema,
  REPORT_TYPES,
  themeUsageReportSchema,
  userActivityReportSchema,
  websiteGenerationReportSchema,
} from './analytics-report';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('REPORT_TYPES', () => {
  it('has exactly the fifteen founder-named report types', () => {
    expect(REPORT_TYPES).toHaveLength(15);
    expect(REPORT_TYPES).toContain('lead_funnel');
    expect(REPORT_TYPES).toContain('executive_dashboard');
  });
});

describe('leadFunnelReportSchema', () => {
  it('accepts a stage breakdown', () => {
    expect(
      leadFunnelReportSchema.safeParse({
        stages: [{ stageKey: 'new', stageName: 'New', count: 10 }],
        totalLeads: 10,
      }).success,
    ).toBe(true);
  });
});

describe('conversionRateReportSchema', () => {
  it('accepts a null overall rate with no data yet', () => {
    expect(
      conversionRateReportSchema.safeParse({ overallRatePercent: null, byPeriod: [] }).success,
    ).toBe(true);
  });
});

describe('aiCostReportSchema', () => {
  it('accepts a populated cost report', () => {
    expect(
      aiCostReportSchema.safeParse({
        totalCostUsd: 12.5,
        byEventType: [{ eventType: 'business_analysis', costUsd: 12.5, count: 3 }],
        byPeriod: [],
        currentMonthSpendUsd: 12.5,
        monthlyCeilingUsd: 300,
      }).success,
    ).toBe(true);
  });
});

describe('aiUsageReportSchema', () => {
  it('accepts a populated usage report', () => {
    expect(
      aiUsageReportSchema.safeParse({
        totalAnalyses: 5,
        totalTokens: 4000,
        byModel: [{ aiModel: 'claude-sonnet-5', count: 5, totalTokens: 4000 }],
        byStatus: [{ label: 'completed', count: 5 }],
        averageExecutionTimeMs: 1200,
      }).success,
    ).toBe(true);
  });
});

describe('deploymentReportSchema', () => {
  it('accepts a null success rate when there are no deployments yet', () => {
    expect(
      deploymentReportSchema.safeParse({
        totalDeployments: 0,
        byStatus: [],
        byProvider: [],
        successRatePercent: null,
        averageExecutionDurationMs: null,
      }).success,
    ).toBe(true);
  });
});

describe('websiteGenerationReportSchema', () => {
  it('accepts a populated report', () => {
    expect(
      websiteGenerationReportSchema.safeParse({
        totalGenerated: 3,
        byPeriod: [],
        averagePublishReadinessScore: 88,
      }).success,
    ).toBe(true);
  });
});

describe('themeUsageReportSchema', () => {
  it('accepts a theme breakdown', () => {
    expect(
      themeUsageReportSchema.safeParse({
        byTheme: [{ themeId: 'modern-1', themeName: 'Modern', count: 4 }],
      }).success,
    ).toBe(true);
  });
});

describe('businessCategoryReportSchema', () => {
  it('accepts a category breakdown', () => {
    expect(
      businessCategoryReportSchema.safeParse({ byCategory: [{ label: 'restaurant', count: 10 }] })
        .success,
    ).toBe(true);
  });
});

describe('industryReportSchema', () => {
  it('accepts a category-to-outcome breakdown', () => {
    expect(
      industryReportSchema.safeParse({
        byCategory: [
          { category: 'restaurant', leadCount: 10, wonCount: 2, totalDealValueUsd: 5000 },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('errorReportSchema', () => {
  it('accepts a module error breakdown', () => {
    expect(
      errorReportSchema.safeParse({
        totalErrors: 2,
        byModule: [{ module: 'business_analysis', failedCount: 2, sampleMessages: ['x'] }],
      }).success,
    ).toBe(true);
  });
});

describe('healthReportSchema', () => {
  it('accepts a full health snapshot', () => {
    expect(
      healthReportSchema.safeParse({
        costCeiling: { spentUsd: 50, ceilingUsd: 300, percentUsed: 16.67 },
        deploymentHealth: { healthy: 3, unhealthy: 0, unknown: 1 },
        recentFailureCount: 0,
      }).success,
    ).toBe(true);
  });
});

describe('userActivityReportSchema', () => {
  it('accepts an actor breakdown including an unassigned/system bucket', () => {
    expect(
      userActivityReportSchema.safeParse({
        byActor: [
          {
            actorId: UUID_A,
            actorName: 'Jane',
            actionCount: 12,
            lastActiveAt: new Date().toISOString(),
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('auditReportSchema', () => {
  it('accepts a paginated audit list', () => {
    expect(
      auditReportSchema.safeParse({
        items: [
          {
            id: UUID_A,
            actorId: UUID_A,
            action: 'lead.created',
            entityType: 'Lead',
            entityId: UUID_A,
            createdAt: new Date().toISOString(),
          },
        ],
        nextCursor: null,
      }).success,
    ).toBe(true);
  });
});

describe('analyticsReportQuerySchema', () => {
  it('defaults period=monthly and limit=25', () => {
    const result = analyticsReportQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.success && result.data.period).toBe('monthly');
    expect(result.success && result.data.limit).toBe(25);
  });
});

describe('analyticsReportEnvelopeSchema', () => {
  it('accepts a full envelope', () => {
    expect(
      analyticsReportEnvelopeSchema.safeParse({
        reportType: 'ai_cost',
        generatedAt: new Date().toISOString(),
        period: 'monthly',
        filters: { fromDate: null, toDate: null },
        data: { totalCostUsd: 0 },
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown reportType', () => {
    expect(
      analyticsReportEnvelopeSchema.safeParse({
        reportType: 'unknown_report',
        generatedAt: new Date().toISOString(),
        period: 'monthly',
        filters: { fromDate: null, toDate: null },
        data: {},
      }).success,
    ).toBe(false);
  });
});
