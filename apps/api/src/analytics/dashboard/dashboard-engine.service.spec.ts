import type {
  AggregationEngineService,
  AggregationRange,
} from '../aggregation/aggregation-engine.service';
import type { AnalyticsEngineService } from '../engine/analytics-engine.service';
import type { AnalyticsProvider } from '../provider/analytics-provider.interface';
import { DashboardEngineService } from './dashboard-engine.service';

const RANGE: AggregationRange = {
  from: new Date('2026-08-01T00:00:00.000Z'),
  to: new Date('2026-08-31T00:00:00.000Z'),
};

describe('DashboardEngineService', () => {
  let analyticsEngineService: {
    getLeadFunnelFacts: jest.Mock;
    getSalesFacts: jest.Mock;
    getAiUsageFacts: jest.Mock;
    getCostFacts: jest.Mock;
    getDeploymentFacts: jest.Mock;
    getWebsiteGenerationFacts: jest.Mock;
    getConversionRateFacts: jest.Mock;
    getHealthFacts: jest.Mock;
  };
  let aggregationEngineService: { resolveRange: jest.Mock };
  let analyticsProvider: { track: jest.Mock };
  let service: DashboardEngineService;

  beforeEach(() => {
    analyticsEngineService = {
      getLeadFunnelFacts: jest.fn().mockResolvedValue({ stages: [], totalLeads: 10 }),
      getSalesFacts: jest
        .fn()
        .mockResolvedValue({ totalPipelineValueUsd: 5000, winRatePercent: 25 }),
      getAiUsageFacts: jest.fn().mockResolvedValue({ totalAnalyses: 4, totalTokens: 3000 }),
      getCostFacts: jest
        .fn()
        .mockResolvedValue({ currentMonthSpendUsd: 50, monthlyCeilingUsd: 300 }),
      getDeploymentFacts: jest
        .fn()
        .mockResolvedValue({ totalDeployments: 2, successRatePercent: 100 }),
      getWebsiteGenerationFacts: jest
        .fn()
        .mockResolvedValue({ totalGenerated: 2, averagePublishReadinessScore: 90 }),
      getConversionRateFacts: jest.fn().mockResolvedValue({ overallRatePercent: 20, byPeriod: [] }),
      getHealthFacts: jest.fn().mockResolvedValue({
        costCeiling: { spentUsd: 50, ceilingUsd: 300, percentUsed: 16.67 },
        deploymentHealth: { healthy: 2, unhealthy: 0, unknown: 0 },
        recentFailureCount: 0,
      }),
    };
    aggregationEngineService = { resolveRange: jest.fn().mockReturnValue(RANGE) };
    analyticsProvider = { track: jest.fn().mockResolvedValue(undefined) };
    service = new DashboardEngineService(
      analyticsEngineService as unknown as AnalyticsEngineService,
      aggregationEngineService as unknown as AggregationEngineService,
      analyticsProvider as unknown as AnalyticsProvider,
    );
  });

  it('composes all eight founder-named widgets from existing Analytics Engine facts, never querying Prisma itself', async () => {
    const result = await service.getDashboard({ period: 'monthly' });

    expect(result.widgets).toEqual({
      leads: { totalLeads: 10 },
      sales: { totalPipelineValueUsd: 5000, winRatePercent: 25 },
      aiUsage: { totalAnalyses: 4, totalTokens: 3000 },
      costs: { spentUsd: 50, ceilingUsd: 300, percentUsed: 16.67 },
      deployments: { totalDeployments: 2, successRatePercent: 100 },
      websiteStatus: { totalGenerated: 2, averagePublishReadinessScore: 90 },
      conversion: { overallRatePercent: 20 },
      systemHealth: { healthy: 2, unhealthy: 0, unknown: 0 },
    });
  });

  it('resolves the range via the Aggregation Engine, never computing dates itself', async () => {
    await service.getDashboard({ period: 'monthly' });
    expect(aggregationEngineService.resolveRange).toHaveBeenCalledWith({ period: 'monthly' });
    expect(analyticsEngineService.getSalesFacts).toHaveBeenCalledWith(RANGE);
  });

  it('composeWidgets is directly callable (shared with the Reporting Engine executive_dashboard report)', async () => {
    const widgets = await service.composeWidgets(RANGE, 'monthly');
    expect(widgets.leads.totalLeads).toBe(10);
  });

  it('tracks a dashboard_viewed analytics event through the injected provider', async () => {
    await service.getDashboard({ period: 'monthly' });
    expect(analyticsProvider.track).toHaveBeenCalledWith({
      eventType: 'dashboard_viewed',
      metadata: { period: 'monthly' },
    });
  });

  it('does not fail the dashboard view when tracking itself throws (best-effort, same precedent as AuditLogService)', async () => {
    analyticsProvider.track.mockRejectedValue(new Error('provider down'));
    await expect(service.getDashboard({ period: 'monthly' })).resolves.toMatchObject({
      period: 'monthly',
    });
  });
});
