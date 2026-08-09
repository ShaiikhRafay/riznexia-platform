'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useAnalyticsDashboard } from '@/src/features/dashboard/api/use-analytics-dashboard';
import { RefreshIntervalProvider } from '@/src/features/dashboard/refresh-interval';
import { formatInteger } from '../format';
import { useAnalyticsPeriod } from '../use-analytics-period';
import { AnalyticsSubNav } from './analytics-sub-nav';
import { AnalyticsViewGate } from './analytics-view-gate';
import { PeriodRangeSelect } from './period-range-select';
import { ReportLinkList } from './report-link-list';
import { Card, Section, Stat, Sub } from './stat-primitives';

const REPORT_TYPES = ['health', 'error'] as const;

// System Monitoring (F12): "Platform Health, Performance, Errors."
// "Performance" has no dedicated report — the real `health` report's own
// fields (`recentFailureCount`, `deploymentHealth`) are the closest real
// reliability/performance signal the backend actually returns; no
// separate score is computed here.
export function SystemMonitoringPage() {
  return (
    <RefreshIntervalProvider>
      <SystemMonitoringPageContent />
    </RefreshIntervalProvider>
  );
}

function SystemMonitoringPageContent() {
  const { options } = useAnalyticsPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <AnalyticsViewGate>
      <div className="flex flex-col gap-6">
        <AnalyticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">System Monitoring</h1>
          <PeriodRangeSelect />
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <Section title="Summary">
            <Card title="Platform Health — Healthy">
              <Stat>{formatInteger(data.widgets.systemHealth.healthy)}</Stat>
            </Card>
            <Card title="Platform Health — Unhealthy">
              <Stat>{formatInteger(data.widgets.systemHealth.unhealthy)}</Stat>
            </Card>
            <Card title="Platform Health — Unknown">
              <Stat>{formatInteger(data.widgets.systemHealth.unknown)}</Stat>
              <Sub>deployments</Sub>
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
