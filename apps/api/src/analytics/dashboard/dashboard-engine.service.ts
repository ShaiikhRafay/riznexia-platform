import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AnalyticsDashboard,
  AnalyticsDashboardQuery,
  DashboardWidgets,
} from '@riznexia/shared-types';
import type { AggregationRange } from '../aggregation/aggregation-engine.service';
import { AggregationEngineService } from '../aggregation/aggregation-engine.service';
import { AnalyticsEngineService } from '../engine/analytics-engine.service';
import {
  ANALYTICS_PROVIDER,
  type AnalyticsProvider,
} from '../provider/analytics-provider.interface';

// Module M12 (DECISIONS.md D-108) — Dashboard Engine. Founder's explicit
// Decision 6: "Dashboard widgets must be composed from existing
// analytics. Do not implement separate business logic for dashboards."
// Every widget below is a lean slice of an AnalyticsEngineService method
// that already exists for the Reporting Engine's own use — nothing here
// re-queries Prisma directly or re-derives a business rule.
@Injectable()
export class DashboardEngineService {
  private readonly logger = new Logger(DashboardEngineService.name);

  constructor(
    private readonly analyticsEngineService: AnalyticsEngineService,
    private readonly aggregationEngineService: AggregationEngineService,
    @Inject(ANALYTICS_PROVIDER) private readonly analyticsProvider: AnalyticsProvider,
  ) {}

  async getDashboard(query: AnalyticsDashboardQuery): Promise<AnalyticsDashboard> {
    const range = this.aggregationEngineService.resolveRange(query);
    const widgets = await this.composeWidgets(range, query.period);

    this.logger.log(`Dashboard Viewed: period=${query.period}`);
    await this.trackBestEffort({
      eventType: 'dashboard_viewed',
      metadata: { period: query.period },
    });

    return { generatedAt: new Date().toISOString(), period: query.period, widgets };
  }

  /**
   * Analytics tracking is best-effort — same precedent as
   * AuditLogService.record(): a failure to track must never fail the
   * dashboard view it describes.
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

  /**
   * The same composition the "executive_dashboard" report exports
   * (founder's explicit Decision 6: "Dashboard and Executive Report must
   * share the same aggregation layer") — `ReportingEngineService` calls
   * this directly rather than re-implementing it.
   */
  async composeWidgets(
    range: AggregationRange,
    period: AnalyticsDashboardQuery['period'],
  ): Promise<DashboardWidgets> {
    const [leadFunnel, sales, aiUsage, costs, deployments, websiteGeneration, conversion, health] =
      await Promise.all([
        this.analyticsEngineService.getLeadFunnelFacts(),
        this.analyticsEngineService.getSalesFacts(range),
        this.analyticsEngineService.getAiUsageFacts(range),
        this.analyticsEngineService.getCostFacts(range, period),
        this.analyticsEngineService.getDeploymentFacts(range),
        this.analyticsEngineService.getWebsiteGenerationFacts(range, period),
        this.analyticsEngineService.getConversionRateFacts(range, period),
        this.analyticsEngineService.getHealthFacts(range),
      ]);

    return {
      leads: { totalLeads: leadFunnel.totalLeads },
      sales: {
        totalPipelineValueUsd: sales.totalPipelineValueUsd,
        winRatePercent: sales.winRatePercent,
      },
      aiUsage: { totalAnalyses: aiUsage.totalAnalyses, totalTokens: aiUsage.totalTokens },
      costs: {
        spentUsd: costs.currentMonthSpendUsd,
        ceilingUsd: costs.monthlyCeilingUsd,
        percentUsed: health.costCeiling.percentUsed,
      },
      deployments: {
        totalDeployments: deployments.totalDeployments,
        successRatePercent: deployments.successRatePercent,
      },
      websiteStatus: {
        totalGenerated: websiteGeneration.totalGenerated,
        averagePublishReadinessScore: websiteGeneration.averagePublishReadinessScore,
      },
      conversion: { overallRatePercent: conversion.overallRatePercent },
      systemHealth: health.deploymentHealth,
    };
  }
}
