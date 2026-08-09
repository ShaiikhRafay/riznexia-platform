import { describe, expect, it } from 'vitest';
import {
  analyticsDashboardQuerySchema,
  analyticsDashboardSchema,
  dashboardWidgetsSchema,
} from './analytics-dashboard';

function fakeWidgets() {
  return {
    leads: { totalLeads: 10 },
    sales: { totalPipelineValueUsd: 5000, winRatePercent: 25 },
    aiUsage: { totalAnalyses: 4, totalTokens: 3000 },
    costs: { spentUsd: 50, ceilingUsd: 300, percentUsed: 16.67 },
    deployments: { totalDeployments: 2, successRatePercent: 100 },
    websiteStatus: { totalGenerated: 2, averagePublishReadinessScore: 90 },
    conversion: { overallRatePercent: 20 },
    systemHealth: { healthy: 2, unhealthy: 0, unknown: 0 },
  };
}

describe('dashboardWidgetsSchema', () => {
  it('accepts all eight founder-named widgets', () => {
    expect(dashboardWidgetsSchema.safeParse(fakeWidgets()).success).toBe(true);
  });
});

describe('analyticsDashboardSchema', () => {
  it('accepts a full dashboard snapshot', () => {
    expect(
      analyticsDashboardSchema.safeParse({
        generatedAt: new Date().toISOString(),
        period: 'monthly',
        widgets: fakeWidgets(),
      }).success,
    ).toBe(true);
  });
});

describe('analyticsDashboardQuerySchema', () => {
  it('defaults period to monthly', () => {
    const result = analyticsDashboardQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.success && result.data.period).toBe('monthly');
  });
});
