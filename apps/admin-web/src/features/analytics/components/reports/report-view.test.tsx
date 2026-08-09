import type { AnalyticsReportEnvelope, ReportType } from '@riznexia/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportView } from './report-view';

function envelope(reportType: ReportType, data: unknown): AnalyticsReportEnvelope {
  return {
    reportType,
    generatedAt: '2026-01-01T00:00:00.000Z',
    period: 'monthly',
    filters: { fromDate: null, toDate: null },
    data,
  };
}

// One dispatcher, one test per real report type — proves `ReportView`
// correctly narrows `envelope.data` (typed `unknown` on the wire) and
// routes to the right renderer for every one of the fifteen closed
// `REPORT_TYPES`, reused identically by the Reports page and every
// dedicated themed page.
describe('ReportView', () => {
  it('renders LeadFunnelReportView for lead_funnel', () => {
    render(
      <ReportView
        envelope={envelope('lead_funnel', {
          stages: [{ stageKey: 'new', stageName: 'New', count: 3 }],
          totalLeads: 3,
        })}
      />,
    );
    expect(screen.getByText('Sales Funnel')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders ConversionRateReportView for conversion_rate', () => {
    render(
      <ReportView
        envelope={envelope('conversion_rate', { overallRatePercent: 50, byPeriod: [] })}
      />,
    );
    expect(screen.getByText('Conversion Report')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('renders SalesPerformanceReportView for sales_performance', () => {
    render(
      <ReportView
        envelope={envelope('sales_performance', {
          generatedAt: '2026-01-01T00:00:00.000Z',
          filters: { fromDate: null, toDate: null, ownerId: null },
          pipelineValueByStage: [],
          totalPipelineValueUsd: 0,
          conversionRatePercent: null,
          winRatePercent: null,
          averageSalesCycleDays: null,
          lostReasonsBreakdown: [],
          salesPerformanceByRep: [],
        })}
      />,
    );
    expect(screen.getByText('Pipeline Value by Stage')).toBeInTheDocument();
  });

  it('renders AiCostReportView for ai_cost', () => {
    render(
      <ReportView
        envelope={envelope('ai_cost', {
          totalCostUsd: 12.5,
          byEventType: [],
          byPeriod: [],
          currentMonthSpendUsd: 12.5,
          monthlyCeilingUsd: 100,
        })}
      />,
    );
    expect(screen.getByText('AI Cost')).toBeInTheDocument();
  });

  it('renders AiUsageReportView for ai_usage', () => {
    render(
      <ReportView
        envelope={envelope('ai_usage', {
          totalAnalyses: 4,
          totalTokens: 1000,
          byModel: [],
          byStatus: [],
          averageExecutionTimeMs: null,
        })}
      />,
    );
    expect(screen.getByText('AI Usage')).toBeInTheDocument();
  });

  it('renders DeploymentReportView for deployment', () => {
    render(
      <ReportView
        envelope={envelope('deployment', {
          totalDeployments: 2,
          byStatus: [],
          byProvider: [],
          successRatePercent: 100,
          averageExecutionDurationMs: null,
        })}
      />,
    );
    expect(screen.getByText('Deployment Report')).toBeInTheDocument();
  });

  it('renders WebsiteGenerationReportView for website_generation', () => {
    render(
      <ReportView
        envelope={envelope('website_generation', {
          totalGenerated: 1,
          byPeriod: [],
          averagePublishReadinessScore: null,
        })}
      />,
    );
    expect(screen.getByText('Website Generation Report')).toBeInTheDocument();
  });

  it('renders ThemeUsageReportView for theme_usage', () => {
    render(<ReportView envelope={envelope('theme_usage', { byTheme: [] })} />);
    expect(screen.getByText('Theme Report')).toBeInTheDocument();
  });

  it('renders BusinessCategoryReportView for business_category', () => {
    render(<ReportView envelope={envelope('business_category', { byCategory: [] })} />);
    expect(screen.getByText('Category Report')).toBeInTheDocument();
  });

  it('renders IndustryReportView for industry', () => {
    render(<ReportView envelope={envelope('industry', { byCategory: [] })} />);
    expect(screen.getByText('Industry Report')).toBeInTheDocument();
  });

  it('renders ErrorReportView for error', () => {
    render(<ReportView envelope={envelope('error', { totalErrors: 0, byModule: [] })} />);
    expect(screen.getByText('Error Report')).toBeInTheDocument();
  });

  it('renders HealthReportView for health', () => {
    render(
      <ReportView
        envelope={envelope('health', {
          costCeiling: { spentUsd: 10, ceilingUsd: 100, percentUsed: 10 },
          deploymentHealth: { healthy: 1, unhealthy: 0, unknown: 0 },
          recentFailureCount: 0,
        })}
      />,
    );
    expect(screen.getByText('Cost Ceiling')).toBeInTheDocument();
  });

  it('renders UserActivityReportView for user_activity', () => {
    render(<ReportView envelope={envelope('user_activity', { byActor: [] })} />);
    expect(screen.getByText('User Activity Report')).toBeInTheDocument();
  });

  it('renders AuditReportView for audit', () => {
    render(<ReportView envelope={envelope('audit', { items: [], nextCursor: null })} />);
    expect(screen.getByText('Audit Report')).toBeInTheDocument();
  });

  it('renders ExecutiveDashboardReportView for executive_dashboard', () => {
    render(
      <ReportView
        envelope={envelope('executive_dashboard', {
          leads: { totalLeads: 1 },
          sales: { totalPipelineValueUsd: 0, winRatePercent: null },
          aiUsage: { totalAnalyses: 0, totalTokens: 0 },
          costs: { spentUsd: 0, ceilingUsd: 100, percentUsed: 0 },
          deployments: { totalDeployments: 0, successRatePercent: null },
          websiteStatus: { totalGenerated: 0, averagePublishReadinessScore: null },
          conversion: { overallRatePercent: null },
          systemHealth: { healthy: 0, unhealthy: 0, unknown: 0 },
        })}
      />,
    );
    expect(screen.getByText('Leads & Sales')).toBeInTheDocument();
  });
});
