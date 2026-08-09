import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AnalyticsReportEnvelope,
  AnalyticsReportQuery,
  ReportType,
} from '@riznexia/shared-types';
import { AggregationEngineService } from '../aggregation/aggregation-engine.service';
import { DashboardEngineService } from '../dashboard/dashboard-engine.service';
import { AnalyticsEngineService } from '../engine/analytics-engine.service';
import {
  ANALYTICS_PROVIDER,
  type AnalyticsProvider,
} from '../provider/analytics-provider.interface';

// Module M12 (DECISIONS.md D-104) — the Reporting Engine: composes
// Analytics Engine facts into the fifteen founder-named report shapes.
// Every branch below calls exactly one (or two, for "executive_dashboard")
// AnalyticsEngineService/DashboardEngineService method — never queries
// Prisma directly, never re-derives a fact the Analytics Engine already
// computed (founder's explicit Decision 2/10).
@Injectable()
export class ReportingEngineService {
  private readonly logger = new Logger(ReportingEngineService.name);

  constructor(
    private readonly analyticsEngineService: AnalyticsEngineService,
    private readonly aggregationEngineService: AggregationEngineService,
    private readonly dashboardEngineService: DashboardEngineService,
    @Inject(ANALYTICS_PROVIDER) private readonly analyticsProvider: AnalyticsProvider,
  ) {}

  async generateReport(
    type: ReportType,
    query: AnalyticsReportQuery,
  ): Promise<AnalyticsReportEnvelope> {
    const range = this.aggregationEngineService.resolveRange(query);
    const data = await this.computeReportData(type, range, query);

    this.logger.log(`Report Generated: type=${type}, period=${query.period}`);
    await this.trackBestEffort({
      eventType: 'report_generated',
      entityType: 'AnalyticsReport',
      entityId: type,
      metadata: { period: query.period },
    });

    return {
      reportType: type,
      generatedAt: new Date().toISOString(),
      period: query.period,
      filters: { fromDate: query.fromDate ?? null, toDate: query.toDate ?? null },
      data,
    };
  }

  /**
   * Best-effort — same precedent as AuditLogService.record(): a failure
   * to track must never fail the report generation it describes.
   */
  private async trackBestEffort(input: Parameters<AnalyticsProvider['track']>[0]): Promise<void> {
    try {
      await this.analyticsProvider.track(input);
    } catch (error) {
      this.logger.warn(
        `Failed to track analytics event "${input.eventType}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async computeReportData(
    type: ReportType,
    range: Awaited<ReturnType<AggregationEngineService['resolveRange']>>,
    query: AnalyticsReportQuery,
  ): Promise<unknown> {
    switch (type) {
      case 'lead_funnel':
        return this.analyticsEngineService.getLeadFunnelFacts();
      case 'conversion_rate':
        return this.analyticsEngineService.getConversionRateFacts(range, query.period);
      case 'sales_performance':
        return this.analyticsEngineService.getSalesFacts(range);
      case 'ai_cost':
        return this.analyticsEngineService.getCostFacts(range, query.period);
      case 'ai_usage':
        return this.analyticsEngineService.getAiUsageFacts(range);
      case 'deployment':
        return this.analyticsEngineService.getDeploymentFacts(range);
      case 'website_generation':
        return this.analyticsEngineService.getWebsiteGenerationFacts(range, query.period);
      case 'theme_usage':
        return this.analyticsEngineService.getThemeUsageFacts();
      case 'business_category':
        return this.analyticsEngineService.getBusinessCategoryFacts();
      case 'industry':
        return this.analyticsEngineService.getIndustryFacts();
      case 'error':
        return this.analyticsEngineService.getErrorFacts(range);
      case 'health':
        return this.analyticsEngineService.getHealthFacts(range);
      case 'user_activity':
        return this.analyticsEngineService.getUserActivityFacts(range);
      case 'audit':
        return this.analyticsEngineService.getAuditFacts({
          cursor: query.cursor,
          limit: query.limit,
        });
      case 'executive_dashboard':
        // The same widget composition the live dashboard renders — an
        // export of it, not a second implementation (founder's Decision 6).
        return this.dashboardEngineService.composeWidgets(range, query.period);
    }
  }
}
