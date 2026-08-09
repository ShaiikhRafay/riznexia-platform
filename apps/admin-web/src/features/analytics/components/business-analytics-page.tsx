'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useAnalyticsDashboard } from '@/src/features/dashboard/api/use-analytics-dashboard';
import { RefreshIntervalProvider } from '@/src/features/dashboard/refresh-interval';
import { formatInteger, formatPercent, formatUsd } from '../format';
import { useAnalyticsPeriod } from '../use-analytics-period';
import { AnalyticsSubNav } from './analytics-sub-nav';
import { AnalyticsViewGate } from './analytics-view-gate';
import { PeriodRangeSelect } from './period-range-select';
import { ReportLinkList } from './report-link-list';
import { Card, Section, Stat, Sub } from './stat-primitives';

const REPORT_TYPES = [
  'lead_funnel',
  'sales_performance',
  'conversion_rate',
  'industry',
  'business_category',
] as const;

// Business Analytics (F12): "Lead Discovery, Lead Funnel, Business
// Analysis, CRM Performance, Growth Metrics, Industry Breakdown, Category
// Breakdown." Widget slice (Leads/Sales/Conversion/AI Usage — "Business
// Analysis" = the AI Business Analyzer's own analyses count, the real
// `aiUsage.totalAnalyses` field) from the same real `GET
// /analytics/dashboard` composition every themed page reuses, plus links
// into the five real reports covering Lead Funnel/CRM Performance/Growth/
// Industry/Category — each report's actual rendering lives once on the
// Reports page (`ReportLinkList`), not duplicated here.
export function BusinessAnalyticsPage() {
  return (
    <RefreshIntervalProvider>
      <BusinessAnalyticsPageContent />
    </RefreshIntervalProvider>
  );
}

function BusinessAnalyticsPageContent() {
  const { options } = useAnalyticsPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <AnalyticsViewGate>
      <div className="flex flex-col gap-6">
        <AnalyticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">Business Analytics</h1>
          <PeriodRangeSelect />
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <Section title="Summary">
            <Card title="Lead Discovery">
              <Stat>{formatInteger(data.widgets.leads.totalLeads)}</Stat>
            </Card>
            <Card title="CRM Performance">
              <Stat>{formatUsd(data.widgets.sales.totalPipelineValueUsd)}</Stat>
              <Sub>{formatPercent(data.widgets.sales.winRatePercent)} win rate</Sub>
            </Card>
            <Card title="Growth (Conversion)">
              <Stat>{formatPercent(data.widgets.conversion.overallRatePercent)}</Stat>
            </Card>
            <Card title="Business Analysis">
              <Stat>{formatInteger(data.widgets.aiUsage.totalAnalyses)}</Stat>
              <Sub>analyses run</Sub>
            </Card>
          </Section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-h2 text-(--color-text-primary) font-semibold">Reports</h2>
          <ReportLinkList types={REPORT_TYPES} />
        </section>
      </div>
    </AnalyticsViewGate>
  );
}
