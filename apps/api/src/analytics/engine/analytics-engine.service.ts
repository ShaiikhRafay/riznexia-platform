import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@riznexia/db';
import type {
  AggregationPeriod,
  AiCostReport,
  AiUsageReport,
  AuditReport,
  BusinessCategoryReport,
  ConversionRateReport,
  DeploymentReport,
  ErrorReport,
  HealthReport,
  IndustryReport,
  LeadFunnelReport,
  SalesPerformanceReport,
  ThemeUsageReport,
  UserActivityReport,
  WebsiteGenerationReport,
} from '@riznexia/shared-types';
import { CostService } from '../../common/cost/cost.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import { ReportingService } from '../../crm/reporting/reporting.service';
import type { AggregationRange } from '../aggregation/aggregation-engine.service';
import { AggregationEngineService } from '../aggregation/aggregation-engine.service';

export interface LeadDiscoveryFacts {
  totalDiscoveryJobs: number;
  totalBusinessesDiscovered: number;
  totalPlaceSyncJobs: number;
  totalApiCallsUsed: number;
}

const AUDIT_PAGE_DEFAULT_LIMIT = 25;

// Module M12 (DECISIONS.md D-104) — the Analytics Engine: one method per
// data domain, each a direct, efficient read of the M1-M11 table that
// already owns that fact (founder's explicit Decision 2 — "aggregate
// existing data only", Decision 10 — "avoid unnecessary database scans,
// reuse existing reporting services"). Never re-derives business meaning
// a source module already computed: `getSalesFacts()` calls M10's own
// `ReportingService.getDashboardStats()` directly rather than re-reading
// `LeadCRM`, the same "read already-computed facts" boundary the
// Reporting Engine (M10) itself established toward the Pipeline Engine
// (D-089), now applied one level up.
//
// The founder's sixteen Analytics Scope domains map onto these methods as
// follows (not 1:1 — several share one underlying table/query):
//   Lead Discovery              -> getLeadDiscoveryFacts()
//   Lead Conversion Funnel      -> getLeadFunnelFacts()
//   Sales CRM, Business Growth  -> getSalesFacts() (+ getBusinessCategoryFacts())
//   Business Analysis, AI Usage -> getAiUsageFacts() (same BusinessAnalysis table)
//   Cost Tracking               -> getCostFacts()
//   Theme Selection             -> getThemeUsageFacts()
//   Website Generation,
//   Website Preview             -> getWebsiteGenerationFacts()
//   Deployment                  -> getDeploymentFacts()
//   Industry                    -> getIndustryFacts()
//   System Health, API Usage,
//   Platform Performance        -> getHealthFacts() (+ execution-time averages on
//                                  getAiUsageFacts()/getDeploymentFacts())
//   User Activity               -> getUserActivityFacts()
//   Audit Logs                  -> getAuditFacts()
//   (Error tracking is cross-cutting, not its own founder-named scope
//   item, but feeds both the Error report and Health's failure count.)
@Injectable()
export class AnalyticsEngineService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly costService: CostService,
    private readonly reportingService: ReportingService,
    private readonly aggregationEngineService: AggregationEngineService,
  ) {}

  // ---------- Business Analytics ----------

  async getLeadDiscoveryFacts(range: AggregationRange): Promise<LeadDiscoveryFacts> {
    const [discoveryAgg, placeSyncAgg] = await Promise.all([
      this.prisma.discoveryJob.aggregate({
        where: { createdAt: { gte: range.from, lte: range.to } },
        _count: true,
        _sum: { resultsCount: true },
      }),
      this.prisma.placeSyncJob.aggregate({
        where: { createdAt: { gte: range.from, lte: range.to } },
        _count: true,
        _sum: { apiCallsUsed: true },
      }),
    ]);

    return {
      totalDiscoveryJobs: discoveryAgg._count,
      totalBusinessesDiscovered: discoveryAgg._sum.resultsCount ?? 0,
      totalPlaceSyncJobs: placeSyncAgg._count,
      totalApiCallsUsed: placeSyncAgg._sum.apiCallsUsed ?? 0,
    };
  }

  async getLeadFunnelFacts(): Promise<LeadFunnelReport> {
    const stages = await this.prisma.salesStage.findMany({
      where: { archivedAt: null },
      orderBy: { order: 'asc' },
      include: { _count: { select: { leadCrms: true } } },
    });

    return {
      stages: stages.map((stage) => ({
        stageKey: stage.key,
        stageName: stage.name,
        count: stage._count.leadCrms,
      })),
      totalLeads: stages.reduce((sum, stage) => sum + stage._count.leadCrms, 0),
    };
  }

  /** Direct passthrough of M10's ReportingService — never re-derived (founder's Decision 2). */
  async getSalesFacts(range: AggregationRange): Promise<SalesPerformanceReport> {
    return this.reportingService.getDashboardStats({
      fromDate: range.from.toISOString(),
      toDate: range.to.toISOString(),
    });
  }

  /**
   * Overall rate reuses ReportingService's own conversionRatePercent
   * (never re-derived); the per-period trend is computed here by
   * bucketizing won-vs-total LeadCRM counts, since DashboardStats only
   * exposes a single snapshot number, not a time series.
   */
  async getConversionRateFacts(
    range: AggregationRange,
    period: AggregationPeriod,
  ): Promise<ConversionRateReport> {
    const [dashboardStats, rows] = await Promise.all([
      this.getSalesFacts(range),
      this.prisma.leadCRM.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
        select: { createdAt: true, stage: { select: { isWon: true } } },
      }),
    ]);

    const wonBuckets = this.aggregationEngineService.bucketize(
      rows,
      (row) => row.createdAt,
      (row) => (row.stage.isWon ? 1 : 0),
      period,
      range,
    );
    const totalBuckets = this.aggregationEngineService.bucketize(
      rows,
      (row) => row.createdAt,
      () => 1,
      period,
      range,
    );

    const byPeriod = wonBuckets.map((won, index) => {
      const total = totalBuckets[index];
      const rate =
        total && total.value > 0 ? Math.round((won.value / total.value) * 10000) / 100 : 0;
      return { periodStart: won.periodStart, periodEnd: won.periodEnd, value: rate };
    });

    return { overallRatePercent: dashboardStats.conversionRatePercent, byPeriod };
  }

  async getBusinessCategoryFacts(): Promise<BusinessCategoryReport> {
    const rows = await this.prisma.business.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
    });
    return { byCategory: rows.map((row) => ({ label: row.category, count: row._count })) };
  }

  /** Distinct from getBusinessCategoryFacts(): ties each category to CRM outcomes. */
  async getIndustryFacts(): Promise<IndustryReport> {
    const rows = await this.prisma.leadCRM.findMany({
      include: {
        lead: { include: { business: { select: { category: true } } } },
        stage: { select: { isWon: true } },
      },
    });

    const byCategory = new Map<
      string,
      { leadCount: number; wonCount: number; totalDealValueUsd: number }
    >();
    for (const row of rows) {
      const category = row.lead.business.category;
      const entry = byCategory.get(category) ?? { leadCount: 0, wonCount: 0, totalDealValueUsd: 0 };
      entry.leadCount += 1;
      if (row.stage.isWon) {
        entry.wonCount += 1;
        entry.totalDealValueUsd += row.dealValueUsd ? Number(row.dealValueUsd) : 0;
      }
      byCategory.set(category, entry);
    }

    return {
      byCategory: Array.from(byCategory.entries())
        .map(([category, facts]) => ({ category, ...facts }))
        .sort((a, b) => b.leadCount - a.leadCount),
    };
  }

  // ---------- Usage Analytics ----------

  /** Covers both "Business Analysis" and "AI Usage" scope domains — same BusinessAnalysis table. */
  async getAiUsageFacts(range: AggregationRange): Promise<AiUsageReport> {
    const where = { createdAt: { gte: range.from, lte: range.to } };
    const [agg, byModel, byStatus] = await Promise.all([
      this.prisma.businessAnalysis.aggregate({
        where,
        _count: true,
        _sum: { totalTokens: true },
        _avg: { executionTimeMs: true },
      }),
      this.prisma.businessAnalysis.groupBy({
        by: ['aiModel'],
        where,
        _count: true,
        _sum: { totalTokens: true },
      }),
      this.prisma.businessAnalysis.groupBy({ by: ['status'], where, _count: true }),
    ]);

    return {
      totalAnalyses: agg._count,
      totalTokens: agg._sum.totalTokens ?? 0,
      byModel: byModel.map((row) => ({
        aiModel: row.aiModel,
        count: row._count,
        totalTokens: row._sum.totalTokens ?? 0,
      })),
      byStatus: byStatus.map((row) => ({ label: row.status.toLowerCase(), count: row._count })),
      averageExecutionTimeMs: agg._avg.executionTimeMs,
    };
  }

  async getCostFacts(range: AggregationRange, period: AggregationPeriod): Promise<AiCostReport> {
    const where = { createdAt: { gte: range.from, lte: range.to } };
    const [agg, byEventType, currentSpend, rows] = await Promise.all([
      this.prisma.costEvent.aggregate({ where, _sum: { costUsd: true } }),
      this.prisma.costEvent.groupBy({
        by: ['eventType'],
        where,
        _count: true,
        _sum: { costUsd: true },
      }),
      this.costService.currentSpend(),
      this.prisma.costEvent.findMany({ where, select: { createdAt: true, costUsd: true } }),
    ]);

    return {
      totalCostUsd: Number(agg._sum.costUsd ?? 0),
      byEventType: byEventType.map((row) => ({
        eventType: row.eventType,
        costUsd: Number(row._sum.costUsd ?? 0),
        count: row._count,
      })),
      byPeriod: this.aggregationEngineService.bucketize(
        rows,
        (row) => row.createdAt,
        (row) => Number(row.costUsd),
        period,
        range,
      ),
      currentMonthSpendUsd: currentSpend.spent,
      monthlyCeilingUsd: currentSpend.ceiling,
    };
  }

  async getThemeUsageFacts(): Promise<ThemeUsageReport> {
    const rows = await this.prisma.themeConfiguration.groupBy({
      by: ['themeId', 'themeName'],
      _count: true,
      orderBy: { _count: { themeId: 'desc' } },
    });
    return {
      byTheme: rows.map((row) => ({
        themeId: row.themeId,
        themeName: row.themeName,
        count: row._count,
      })),
    };
  }

  /** Covers both "Website Generation" and "Website Preview" scope domains. */
  async getWebsiteGenerationFacts(
    range: AggregationRange,
    period: AggregationPeriod,
  ): Promise<WebsiteGenerationReport> {
    const where = { createdAt: { gte: range.from, lte: range.to } };
    const [totalGenerated, reports, generatedRows] = await Promise.all([
      this.prisma.generatedWebsite.count({ where }),
      this.prisma.publishReadinessReport.findMany({ where, select: { overallPublishScore: true } }),
      this.prisma.generatedWebsite.findMany({ where, select: { createdAt: true } }),
    ]);

    const scores = reports
      .map((report) => report.overallPublishScore as unknown as { score: number; maxScore: number })
      .filter((score) => score.maxScore > 0)
      .map((score) => (score.score / score.maxScore) * 100);
    const averagePublishReadinessScore =
      scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
    const byPeriod = this.aggregationEngineService.bucketize(
      generatedRows,
      (row) => row.createdAt,
      () => 1,
      period,
      range,
    );

    return { totalGenerated, byPeriod, averagePublishReadinessScore };
  }

  /** Covers "Deployment" and part of "Platform Performance". */
  async getDeploymentFacts(range: AggregationRange): Promise<DeploymentReport> {
    const where = { createdAt: { gte: range.from, lte: range.to } };
    const [totalDeployments, byStatus, byProvider, avgDuration] = await Promise.all([
      this.prisma.websiteDeployment.count({ where }),
      this.prisma.websiteDeployment.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.websiteDeployment.groupBy({ by: ['provider'], where, _count: true }),
      this.prisma.websiteDeployment.aggregate({ where, _avg: { executionDuration: true } }),
    ]);

    const completed = byStatus.find((row) => row.status === 'COMPLETED')?._count ?? 0;
    const failed = byStatus.find((row) => row.status === 'FAILED')?._count ?? 0;
    const decided = completed + failed;

    return {
      totalDeployments,
      byStatus: byStatus.map((row) => ({ label: row.status.toLowerCase(), count: row._count })),
      byProvider: byProvider.map((row) => ({
        label: row.provider.toLowerCase(),
        count: row._count,
      })),
      successRatePercent: decided > 0 ? Math.round((completed / decided) * 10000) / 100 : null,
      averageExecutionDurationMs: avgDuration._avg.executionDuration,
    };
  }

  // ---------- System Monitoring ----------

  /** Covers "System Health", "API Usage" (deployment/discovery call volume already counted elsewhere), and the remainder of "Platform Performance". */
  async getHealthFacts(range: AggregationRange): Promise<HealthReport> {
    const [currentSpend, byHealthStatus, errors] = await Promise.all([
      this.costService.currentSpend(),
      this.prisma.websiteDeployment.groupBy({ by: ['healthStatus'], _count: true }),
      this.getErrorFacts(range),
    ]);

    const percentUsed =
      currentSpend.ceiling > 0
        ? Math.round((currentSpend.spent / currentSpend.ceiling) * 10000) / 100
        : 0;
    const healthy = byHealthStatus.find((row) => row.healthStatus === 'HEALTHY')?._count ?? 0;
    const unhealthy = byHealthStatus.find((row) => row.healthStatus === 'UNHEALTHY')?._count ?? 0;
    const unknown = byHealthStatus.find((row) => row.healthStatus === 'UNKNOWN')?._count ?? 0;

    return {
      costCeiling: { spentUsd: currentSpend.spent, ceilingUsd: currentSpend.ceiling, percentUsed },
      deploymentHealth: { healthy, unhealthy, unknown },
      recentFailureCount: errors.totalErrors,
    };
  }

  async getUserActivityFacts(range: AggregationRange): Promise<UserActivityReport> {
    const where = { createdAt: { gte: range.from, lte: range.to } };
    const grouped = await this.prisma.auditLog.groupBy({
      by: ['actorId'],
      where,
      _count: true,
      _max: { createdAt: true },
    });

    const actorIds = grouped.map((row) => row.actorId).filter((id): id is string => id !== null);
    const actors =
      actorIds.length > 0
        ? await this.prisma.teamMember.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(actors.map((actor) => [actor.id, actor.name]));

    return {
      byActor: grouped
        .map((row) => ({
          actorId: row.actorId,
          actorName: row.actorId ? (nameById.get(row.actorId) ?? null) : null,
          actionCount: row._count,
          lastActiveAt: row._max.createdAt?.toISOString() ?? null,
        }))
        .sort((a, b) => b.actionCount - a.actionCount),
    };
  }

  async getAuditFacts(query: { cursor?: string; limit?: number }): Promise<AuditReport> {
    const limit = query.limit ?? AUDIT_PAGE_DEFAULT_LIMIT;
    const rows = await this.prisma.auditLog.findMany({
      take: limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async getErrorFacts(range: AggregationRange): Promise<ErrorReport> {
    const where = { createdAt: { gte: range.from, lte: range.to }, status: 'FAILED' as const };

    const [discoveryJobs, placeSyncJobs, businessAnalyses, deployments] = await Promise.all([
      this.prisma.discoveryJob.findMany({ where, select: { id: true }, take: 5 }),
      this.prisma.placeSyncJob.findMany({ where, select: { errorMessage: true }, take: 5 }),
      this.prisma.businessAnalysis.findMany({ where, select: { rawResponse: true }, take: 5 }),
      this.prisma.websiteDeployment.findMany({ where, select: { errorMessage: true }, take: 5 }),
    ]);

    const [discoveryCount, placeSyncCount, businessAnalysisCount, deploymentCount] =
      await Promise.all([
        this.prisma.discoveryJob.count({ where }),
        this.prisma.placeSyncJob.count({ where }),
        this.prisma.businessAnalysis.count({ where }),
        this.prisma.websiteDeployment.count({ where }),
      ]);

    const byModule = [
      {
        module: 'discovery',
        failedCount: discoveryCount,
        sampleMessages: discoveryJobs.map(() => 'Discovery job failed'),
      },
      {
        module: 'place_sync',
        failedCount: placeSyncCount,
        sampleMessages: placeSyncJobs.map((row) => row.errorMessage ?? 'Unknown error'),
      },
      {
        module: 'business_analysis',
        failedCount: businessAnalysisCount,
        sampleMessages: businessAnalyses.map(() => 'Business analysis failed'),
      },
      {
        module: 'deployment',
        failedCount: deploymentCount,
        sampleMessages: deployments.map((row) => row.errorMessage ?? 'Unknown error'),
      },
    ].filter((entry) => entry.failedCount > 0);

    return {
      totalErrors: discoveryCount + placeSyncCount + businessAnalysisCount + deploymentCount,
      byModule,
    };
  }
}
