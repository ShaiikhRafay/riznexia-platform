import type { PrismaClient } from '@riznexia/db';
import type { CostService } from '../../common/cost/cost.service';
import type { ReportingService } from '../../crm/reporting/reporting.service';
import type {
  AggregationEngineService,
  AggregationRange,
} from '../aggregation/aggregation-engine.service';
import { AnalyticsEngineService } from './analytics-engine.service';

const RANGE: AggregationRange = {
  from: new Date('2026-08-01T00:00:00.000Z'),
  to: new Date('2026-08-31T23:59:59.999Z'),
};

describe('AnalyticsEngineService', () => {
  let prisma: {
    discoveryJob: { aggregate: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    placeSyncJob: { aggregate: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    salesStage: { findMany: jest.Mock };
    leadCRM: { findMany: jest.Mock };
    business: { groupBy: jest.Mock };
    businessAnalysis: {
      aggregate: jest.Mock;
      groupBy: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    costEvent: { aggregate: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
    themeConfiguration: { groupBy: jest.Mock };
    generatedWebsite: { count: jest.Mock; findMany: jest.Mock };
    publishReadinessReport: { findMany: jest.Mock };
    websiteDeployment: {
      count: jest.Mock;
      groupBy: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
    auditLog: { groupBy: jest.Mock; findMany: jest.Mock };
    teamMember: { findMany: jest.Mock };
  };
  let costService: { currentSpend: jest.Mock };
  let reportingService: { getDashboardStats: jest.Mock };
  let aggregationEngineService: { bucketize: jest.Mock };
  let service: AnalyticsEngineService;

  beforeEach(() => {
    prisma = {
      discoveryJob: {
        aggregate: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      placeSyncJob: {
        aggregate: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      salesStage: { findMany: jest.fn() },
      leadCRM: { findMany: jest.fn() },
      business: { groupBy: jest.fn() },
      businessAnalysis: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      costEvent: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      themeConfiguration: { groupBy: jest.fn() },
      generatedWebsite: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      publishReadinessReport: { findMany: jest.fn().mockResolvedValue([]) },
      websiteDeployment: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: { groupBy: jest.fn(), findMany: jest.fn() },
      teamMember: { findMany: jest.fn().mockResolvedValue([]) },
    };
    costService = { currentSpend: jest.fn().mockResolvedValue({ spent: 50, ceiling: 300 }) };
    reportingService = {
      getDashboardStats: jest.fn().mockResolvedValue({ conversionRatePercent: 25 }),
    };
    aggregationEngineService = { bucketize: jest.fn().mockReturnValue([]) };

    service = new AnalyticsEngineService(
      prisma as unknown as PrismaClient,
      costService as unknown as CostService,
      reportingService as unknown as ReportingService,
      aggregationEngineService as unknown as AggregationEngineService,
    );
  });

  describe('getLeadDiscoveryFacts', () => {
    it('sums discovery/place-sync job counts within range', async () => {
      prisma.discoveryJob.aggregate.mockResolvedValue({ _count: 3, _sum: { resultsCount: 42 } });
      prisma.placeSyncJob.aggregate.mockResolvedValue({ _count: 2, _sum: { apiCallsUsed: 10 } });

      const result = await service.getLeadDiscoveryFacts(RANGE);

      expect(result).toEqual({
        totalDiscoveryJobs: 3,
        totalBusinessesDiscovered: 42,
        totalPlaceSyncJobs: 2,
        totalApiCallsUsed: 10,
      });
    });

    it('defaults null sums to 0 when there is no data yet', async () => {
      prisma.discoveryJob.aggregate.mockResolvedValue({ _count: 0, _sum: { resultsCount: null } });
      prisma.placeSyncJob.aggregate.mockResolvedValue({ _count: 0, _sum: { apiCallsUsed: null } });
      const result = await service.getLeadDiscoveryFacts(RANGE);
      expect(result.totalBusinessesDiscovered).toBe(0);
      expect(result.totalApiCallsUsed).toBe(0);
    });
  });

  describe('getLeadFunnelFacts', () => {
    it('maps every non-archived stage to a count, ordered by stage order', async () => {
      prisma.salesStage.findMany.mockResolvedValue([
        { key: 'new', name: 'New', _count: { leadCrms: 5 } },
        { key: 'won', name: 'Won', _count: { leadCrms: 2 } },
      ]);

      const result = await service.getLeadFunnelFacts();

      expect(result.stages).toEqual([
        { stageKey: 'new', stageName: 'New', count: 5 },
        { stageKey: 'won', stageName: 'Won', count: 2 },
      ]);
      expect(result.totalLeads).toBe(7);
      expect(prisma.salesStage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { archivedAt: null } }),
      );
    });
  });

  describe('getSalesFacts', () => {
    it('delegates directly to ReportingService.getDashboardStats, never re-deriving', async () => {
      await service.getSalesFacts(RANGE);
      expect(reportingService.getDashboardStats).toHaveBeenCalledWith({
        fromDate: RANGE.from.toISOString(),
        toDate: RANGE.to.toISOString(),
      });
    });
  });

  describe('getConversionRateFacts', () => {
    it('reuses ReportingService for the overall rate and bucketizes won-vs-total for the trend', async () => {
      prisma.leadCRM.findMany.mockResolvedValue([
        { createdAt: new Date(), stage: { isWon: true } },
      ]);
      aggregationEngineService.bucketize
        .mockReturnValueOnce([{ periodStart: 'a', periodEnd: 'b', value: 1 }])
        .mockReturnValueOnce([{ periodStart: 'a', periodEnd: 'b', value: 4 }]);

      const result = await service.getConversionRateFacts(RANGE, 'monthly');

      expect(result.overallRatePercent).toBe(25);
      expect(result.byPeriod).toEqual([{ periodStart: 'a', periodEnd: 'b', value: 25 }]);
    });

    it('reports a 0% rate for an empty bucket rather than dividing by zero', async () => {
      prisma.leadCRM.findMany.mockResolvedValue([]);
      aggregationEngineService.bucketize
        .mockReturnValueOnce([{ periodStart: 'a', periodEnd: 'b', value: 0 }])
        .mockReturnValueOnce([{ periodStart: 'a', periodEnd: 'b', value: 0 }]);

      const result = await service.getConversionRateFacts(RANGE, 'monthly');

      expect(result.byPeriod[0]?.value).toBe(0);
    });
  });

  describe('getBusinessCategoryFacts', () => {
    it('maps category groups to label/count', async () => {
      prisma.business.groupBy.mockResolvedValue([{ category: 'restaurant', _count: 10 }]);
      const result = await service.getBusinessCategoryFacts();
      expect(result.byCategory).toEqual([{ label: 'restaurant', count: 10 }]);
    });
  });

  describe('getIndustryFacts', () => {
    it('ties each category to won-count and total deal value', async () => {
      prisma.leadCRM.findMany.mockResolvedValue([
        {
          dealValueUsd: 1000,
          lead: { business: { category: 'restaurant' } },
          stage: { isWon: true },
        },
        {
          dealValueUsd: null,
          lead: { business: { category: 'restaurant' } },
          stage: { isWon: false },
        },
        { dealValueUsd: 500, lead: { business: { category: 'gym' } }, stage: { isWon: true } },
      ]);

      const result = await service.getIndustryFacts();

      expect(result.byCategory).toEqual(
        expect.arrayContaining([
          { category: 'restaurant', leadCount: 2, wonCount: 1, totalDealValueUsd: 1000 },
          { category: 'gym', leadCount: 1, wonCount: 1, totalDealValueUsd: 500 },
        ]),
      );
    });
  });

  describe('getAiUsageFacts', () => {
    it('aggregates totals, groups by model and status', async () => {
      prisma.businessAnalysis.aggregate.mockResolvedValue({
        _count: 5,
        _sum: { totalTokens: 4000 },
        _avg: { executionTimeMs: 1200 },
      });
      prisma.businessAnalysis.groupBy
        .mockResolvedValueOnce([
          { aiModel: 'claude-sonnet-5', _count: 5, _sum: { totalTokens: 4000 } },
        ])
        .mockResolvedValueOnce([{ status: 'COMPLETED', _count: 5 }]);

      const result = await service.getAiUsageFacts(RANGE);

      expect(result).toEqual({
        totalAnalyses: 5,
        totalTokens: 4000,
        byModel: [{ aiModel: 'claude-sonnet-5', count: 5, totalTokens: 4000 }],
        byStatus: [{ label: 'completed', count: 5 }],
        averageExecutionTimeMs: 1200,
      });
    });
  });

  describe('getCostFacts', () => {
    it('sums cost, groups by event type, and includes the current-month ceiling status', async () => {
      prisma.costEvent.aggregate.mockResolvedValue({ _sum: { costUsd: 12.5 } });
      prisma.costEvent.groupBy.mockResolvedValue([
        { eventType: 'business_analysis', _count: 3, _sum: { costUsd: 12.5 } },
      ]);

      const result = await service.getCostFacts(RANGE, 'monthly');

      expect(result.totalCostUsd).toBe(12.5);
      expect(result.byEventType).toEqual([
        { eventType: 'business_analysis', costUsd: 12.5, count: 3 },
      ]);
      expect(result.currentMonthSpendUsd).toBe(50);
      expect(result.monthlyCeilingUsd).toBe(300);
    });
  });

  describe('getThemeUsageFacts', () => {
    it('maps theme groups to id/name/count', async () => {
      prisma.themeConfiguration.groupBy.mockResolvedValue([
        { themeId: 'modern-1', themeName: 'Modern', _count: 4 },
      ]);
      const result = await service.getThemeUsageFacts();
      expect(result.byTheme).toEqual([{ themeId: 'modern-1', themeName: 'Modern', count: 4 }]);
    });
  });

  describe('getWebsiteGenerationFacts', () => {
    it('computes the average publish-readiness score from score/maxScore ratios', async () => {
      prisma.generatedWebsite.count.mockResolvedValue(2);
      prisma.publishReadinessReport.findMany.mockResolvedValue([
        { overallPublishScore: { score: 90, maxScore: 100 } },
        { overallPublishScore: { score: 70, maxScore: 100 } },
      ]);

      const result = await service.getWebsiteGenerationFacts(RANGE, 'monthly');

      expect(result.totalGenerated).toBe(2);
      expect(result.averagePublishReadinessScore).toBe(80);
    });

    it('reports a null average when no reports exist yet', async () => {
      prisma.generatedWebsite.count.mockResolvedValue(0);
      prisma.publishReadinessReport.findMany.mockResolvedValue([]);
      const result = await service.getWebsiteGenerationFacts(RANGE, 'monthly');
      expect(result.averagePublishReadinessScore).toBeNull();
    });
  });

  describe('getDeploymentFacts', () => {
    it('computes a success rate from completed vs failed, excluding in-progress statuses', async () => {
      prisma.websiteDeployment.count.mockResolvedValue(10);
      prisma.websiteDeployment.groupBy
        .mockResolvedValueOnce([
          { status: 'COMPLETED', _count: 8 },
          { status: 'FAILED', _count: 2 },
        ])
        .mockResolvedValueOnce([{ provider: 'VERCEL', _count: 10 }]);
      prisma.websiteDeployment.aggregate.mockResolvedValue({ _avg: { executionDuration: 2500 } });

      const result = await service.getDeploymentFacts(RANGE);

      expect(result.successRatePercent).toBe(80);
      expect(result.byProvider).toEqual([{ label: 'vercel', count: 10 }]);
    });

    it('reports a null success rate when there are no decided (completed/failed) deployments yet', async () => {
      prisma.websiteDeployment.count.mockResolvedValue(1);
      prisma.websiteDeployment.groupBy
        .mockResolvedValueOnce([{ status: 'IN_PROGRESS', _count: 1 }])
        .mockResolvedValueOnce([]);
      prisma.websiteDeployment.aggregate.mockResolvedValue({ _avg: { executionDuration: null } });

      const result = await service.getDeploymentFacts(RANGE);

      expect(result.successRatePercent).toBeNull();
    });
  });

  describe('getHealthFacts', () => {
    it('composes cost ceiling status, deployment health counts, and recent failure count', async () => {
      prisma.websiteDeployment.groupBy.mockResolvedValue([
        { healthStatus: 'HEALTHY', _count: 3 },
        { healthStatus: 'UNHEALTHY', _count: 1 },
      ]);
      prisma.discoveryJob.count.mockResolvedValue(1);

      const result = await service.getHealthFacts(RANGE);

      expect(result.costCeiling).toEqual({ spentUsd: 50, ceilingUsd: 300, percentUsed: 16.67 });
      expect(result.deploymentHealth).toEqual({ healthy: 3, unhealthy: 1, unknown: 0 });
      expect(result.recentFailureCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getUserActivityFacts', () => {
    it('joins grouped audit-log actor counts with team member names', async () => {
      prisma.auditLog.groupBy.mockResolvedValue([
        { actorId: 'user-1', _count: 5, _max: { createdAt: new Date('2026-08-01T00:00:00.000Z') } },
      ]);
      prisma.teamMember.findMany.mockResolvedValue([{ id: 'user-1', name: 'Jane' }]);

      const result = await service.getUserActivityFacts(RANGE);

      expect(result.byActor).toEqual([
        {
          actorId: 'user-1',
          actorName: 'Jane',
          actionCount: 5,
          lastActiveAt: '2026-08-01T00:00:00.000Z',
        },
      ]);
    });

    it('handles a null actorId (system-originated action) without crashing', async () => {
      prisma.auditLog.groupBy.mockResolvedValue([
        { actorId: null, _count: 2, _max: { createdAt: new Date() } },
      ]);
      const result = await service.getUserActivityFacts(RANGE);
      expect(result.byActor[0]?.actorName).toBeNull();
    });
  });

  describe('getAuditFacts', () => {
    it('paginates, reporting nextCursor when more rows exist than the limit', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'a',
          actorId: null,
          action: 'lead.created',
          entityType: 'Lead',
          entityId: 'x',
          createdAt: new Date(),
        },
        {
          id: 'b',
          actorId: null,
          action: 'lead.created',
          entityType: 'Lead',
          entityId: 'y',
          createdAt: new Date(),
        },
      ]);
      const result = await service.getAuditFacts({ limit: 1 });
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe('a');
    });
  });

  describe('getErrorFacts', () => {
    it('sums FAILED counts across all four modules, excluding modules with zero failures', async () => {
      prisma.discoveryJob.count.mockResolvedValue(1);
      prisma.placeSyncJob.count.mockResolvedValue(0);
      prisma.businessAnalysis.count.mockResolvedValue(2);
      prisma.websiteDeployment.count.mockResolvedValue(0);

      const result = await service.getErrorFacts(RANGE);

      expect(result.totalErrors).toBe(3);
      expect(result.byModule.map((m) => m.module)).toEqual(['discovery', 'business_analysis']);
    });
  });
});
