'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useAnalyticsDashboard } from '@/src/features/dashboard/api/use-analytics-dashboard';
import { RefreshIntervalProvider } from '@/src/features/dashboard/refresh-interval';
import { formatPercent, formatUsd } from '../format';
import { useAnalyticsPeriod } from '../use-analytics-period';
import { AnalyticsSubNav } from './analytics-sub-nav';
import { AnalyticsViewGate } from './analytics-view-gate';
import { PeriodRangeSelect } from './period-range-select';
import { ReportLinkList } from './report-link-list';
import { Card, Section, Stat, Sub } from './stat-primitives';

const REPORT_TYPES = ['ai_cost'] as const;

// Cost Analytics (F12): a focused zoom on the real `costs` dashboard
// widget plus the one real cost report (`ai_cost` — the only cost-related
// `ReportType`, verified directly against `REPORT_TYPES`).
export function CostAnalyticsPage() {
  return (
    <RefreshIntervalProvider>
      <CostAnalyticsPageContent />
    </RefreshIntervalProvider>
  );
}

function CostAnalyticsPageContent() {
  const { options } = useAnalyticsPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <AnalyticsViewGate>
      <div className="flex flex-col gap-6">
        <AnalyticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">Cost Analytics</h1>
          <PeriodRangeSelect />
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <Section title="Summary">
            <Card title="Spent">
              <Stat>{formatUsd(data.widgets.costs.spentUsd)}</Stat>
            </Card>
            <Card title="Ceiling">
              <Stat>{formatUsd(data.widgets.costs.ceilingUsd)}</Stat>
            </Card>
            <Card title="Percent Used">
              <Stat>{formatPercent(data.widgets.costs.percentUsed)}</Stat>
              <Sub>of monthly ceiling</Sub>
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
