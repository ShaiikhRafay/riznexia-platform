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
  'ai_usage',
  'ai_cost',
  'deployment',
  'website_generation',
  'theme_usage',
] as const;

// Usage Analytics (F12): "AI Usage, AI Cost, API Usage, Theme Usage,
// Website Generation, Preview Usage, Deployment Usage." "API Usage" and
// "Preview Usage" have no backend report type or dashboard field anywhere
// in M12 (verified against `REPORT_TYPES` and `dashboardWidgetsSchema`
// directly) — not fabricated here; every other item is real.
export function UsageAnalyticsPage() {
  return (
    <RefreshIntervalProvider>
      <UsageAnalyticsPageContent />
    </RefreshIntervalProvider>
  );
}

function UsageAnalyticsPageContent() {
  const { options } = useAnalyticsPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <AnalyticsViewGate>
      <div className="flex flex-col gap-6">
        <AnalyticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">Usage Analytics</h1>
          <PeriodRangeSelect />
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <Section title="Summary">
            <Card title="AI Usage">
              <Stat>{formatInteger(data.widgets.aiUsage.totalAnalyses)}</Stat>
              <Sub>{formatInteger(data.widgets.aiUsage.totalTokens)} tokens</Sub>
            </Card>
            <Card title="AI Cost">
              <Stat>{formatUsd(data.widgets.costs.spentUsd)}</Stat>
              <Sub>{formatPercent(data.widgets.costs.percentUsed)} of ceiling</Sub>
            </Card>
            <Card title="Deployment Usage">
              <Stat>{formatInteger(data.widgets.deployments.totalDeployments)}</Stat>
              <Sub>{formatPercent(data.widgets.deployments.successRatePercent)} success</Sub>
            </Card>
            <Card title="Website Generation">
              <Stat>{formatInteger(data.widgets.websiteStatus.totalGenerated)}</Stat>
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
