import type { REPORT_TYPES } from '@riznexia/shared-types';
import type {
  AggregationEngineService,
  AggregationRange,
} from '../aggregation/aggregation-engine.service';
import type { DashboardEngineService } from '../dashboard/dashboard-engine.service';
import type { AnalyticsEngineService } from '../engine/analytics-engine.service';
import type { AnalyticsProvider } from '../provider/analytics-provider.interface';
import { ReportingEngineService } from './reporting-engine.service';

const RANGE: AggregationRange = {
  from: new Date('2026-08-01T00:00:00.000Z'),
  to: new Date('2026-08-31T00:00:00.000Z'),
};

describe('ReportingEngineService', () => {
  let analyticsEngineService: Record<string, jest.Mock>;
  let aggregationEngineService: { resolveRange: jest.Mock };
  let dashboardEngineService: { composeWidgets: jest.Mock };
  let analyticsProvider: { track: jest.Mock };
  let service: ReportingEngineService;

  beforeEach(() => {
    analyticsEngineService = {
      getLeadFunnelFacts: jest.fn().mockResolvedValue({ stages: [], totalLeads: 0 }),
      getConversionRateFacts: jest
        .fn()
        .mockResolvedValue({ overallRatePercent: null, byPeriod: [] }),
      getSalesFacts: jest.fn().mockResolvedValue({}),
      getCostFacts: jest.fn().mockResolvedValue({}),
      getAiUsageFacts: jest.fn().mockResolvedValue({}),
      getDeploymentFacts: jest.fn().mockResolvedValue({}),
      getWebsiteGenerationFacts: jest.fn().mockResolvedValue({}),
      getThemeUsageFacts: jest.fn().mockResolvedValue({}),
      getBusinessCategoryFacts: jest.fn().mockResolvedValue({}),
      getIndustryFacts: jest.fn().mockResolvedValue({}),
      getErrorFacts: jest.fn().mockResolvedValue({}),
      getHealthFacts: jest.fn().mockResolvedValue({}),
      getUserActivityFacts: jest.fn().mockResolvedValue({}),
      getAuditFacts: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
    };
    aggregationEngineService = { resolveRange: jest.fn().mockReturnValue(RANGE) };
    dashboardEngineService = {
      composeWidgets: jest.fn().mockResolvedValue({ leads: { totalLeads: 0 } }),
    };
    analyticsProvider = { track: jest.fn().mockResolvedValue(undefined) };

    service = new ReportingEngineService(
      analyticsEngineService as unknown as AnalyticsEngineService,
      aggregationEngineService as unknown as AggregationEngineService,
      dashboardEngineService as unknown as DashboardEngineService,
      analyticsProvider as unknown as AnalyticsProvider,
    );
  });

  it('resolves the range via the Aggregation Engine before computing anything', async () => {
    await service.generateReport('lead_funnel', { period: 'monthly', limit: 25 });
    expect(aggregationEngineService.resolveRange).toHaveBeenCalledWith({
      period: 'monthly',
      limit: 25,
    });
  });

  it('wraps the computed data in the envelope with reportType/generatedAt/period/filters', async () => {
    const result = await service.generateReport('lead_funnel', {
      period: 'monthly',
      fromDate: '2026-08-01T00:00:00.000Z',
      limit: 25,
    });
    expect(result).toMatchObject({
      reportType: 'lead_funnel',
      period: 'monthly',
      filters: { fromDate: '2026-08-01T00:00:00.000Z', toDate: null },
    });
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it.each([
    ['lead_funnel', 'getLeadFunnelFacts'],
    ['sales_performance', 'getSalesFacts'],
    ['ai_usage', 'getAiUsageFacts'],
    ['deployment', 'getDeploymentFacts'],
    ['theme_usage', 'getThemeUsageFacts'],
    ['business_category', 'getBusinessCategoryFacts'],
    ['industry', 'getIndustryFacts'],
    ['error', 'getErrorFacts'],
    ['health', 'getHealthFacts'],
    ['user_activity', 'getUserActivityFacts'],
  ] as [(typeof REPORT_TYPES)[number], string][])(
    'routes report type "%s" to AnalyticsEngineService.%s',
    async (type, methodName) => {
      await service.generateReport(type, { period: 'monthly', limit: 25 });
      expect(analyticsEngineService[methodName]).toHaveBeenCalled();
    },
  );

  it('routes conversion_rate and ai_cost and website_generation to their bucketized facts methods with the period', async () => {
    await service.generateReport('conversion_rate', { period: 'weekly', limit: 25 });
    expect(analyticsEngineService.getConversionRateFacts).toHaveBeenCalledWith(RANGE, 'weekly');

    await service.generateReport('ai_cost', { period: 'weekly', limit: 25 });
    expect(analyticsEngineService.getCostFacts).toHaveBeenCalledWith(RANGE, 'weekly');

    await service.generateReport('website_generation', { period: 'weekly', limit: 25 });
    expect(analyticsEngineService.getWebsiteGenerationFacts).toHaveBeenCalledWith(RANGE, 'weekly');
  });

  it('routes audit to getAuditFacts with cursor/limit only', async () => {
    await service.generateReport('audit', { period: 'monthly', cursor: 'cursor-1', limit: 10 });
    expect(analyticsEngineService.getAuditFacts).toHaveBeenCalledWith({
      cursor: 'cursor-1',
      limit: 10,
    });
  });

  it('routes executive_dashboard to DashboardEngineService.composeWidgets — the same composition, not a second implementation', async () => {
    const result = await service.generateReport('executive_dashboard', {
      period: 'monthly',
      limit: 25,
    });
    expect(dashboardEngineService.composeWidgets).toHaveBeenCalledWith(RANGE, 'monthly');
    expect(result.data).toEqual({ leads: { totalLeads: 0 } });
  });

  it('tracks a report_generated analytics event through the injected provider', async () => {
    await service.generateReport('ai_cost', { period: 'monthly', limit: 25 });
    expect(analyticsProvider.track).toHaveBeenCalledWith({
      eventType: 'report_generated',
      entityType: 'AnalyticsReport',
      entityId: 'ai_cost',
      metadata: { period: 'monthly' },
    });
  });

  it('does not fail report generation when tracking itself throws (best-effort)', async () => {
    analyticsProvider.track.mockRejectedValue(new Error('provider down'));
    await expect(
      service.generateReport('lead_funnel', { period: 'monthly', limit: 25 }),
    ).resolves.toMatchObject({ reportType: 'lead_funnel' });
  });
});
