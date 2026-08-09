'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import Link from 'next/link';
import { useAnalyticsDashboard } from '@/src/features/dashboard/api/use-analytics-dashboard';
import { RefreshIntervalProvider } from '@/src/features/dashboard/refresh-interval';
import { formatInteger, formatPercent, formatUsd } from '../format';
import { useAnalyticsPeriod } from '../use-analytics-period';
import { AnalyticsSubNav } from './analytics-sub-nav';
import { AnalyticsViewGate } from './analytics-view-gate';
import { PeriodRangeSelect } from './period-range-select';
import { Card, Section, Stat, Sub } from './stat-primitives';

// Analytics Dashboard (F12): "Dashboard should display: Business
// Analytics (Lead Discovery, Lead Funnel, Business Analysis, CRM
// Performance, Growth Metrics, Industry Breakdown, Category Breakdown),
// Usage Analytics (AI Usage, AI Cost, API Usage, Theme Usage, Website
// Generation, Preview Usage, Deployment Usage), System Monitoring
// (Platform Health, Performance, Errors), Audit Activity, User Activity."
//
// The real `GET /analytics/dashboard` composes exactly eight widgets
// (`leads`/`sales`/`aiUsage`/`costs`/`deployments`/`websiteStatus`/
// `conversion`/`systemHealth` — verified against `dashboardWidgetsSchema`
// and the backend's own comment: "Dashboard widgets must be composed from
// existing analytics. Do not implement separate business logic for
// dashboards"). This page shows exactly those eight real fields, grouped
// under the founder's own three headings; concepts with no dashboard-level
// field (API Usage, Preview Usage, Business Analysis as its own metric,
// Industry/Category Breakdown, Growth Metrics as distinct from Conversion)
// are not fabricated here — the full corresponding Report exists on the
// Reports page instead, where the real backend data for most of them
// actually lives. Audit Activity and User Activity have no dashboard
// widget at all; this page links to their own dedicated pages rather than
// inventing a summary number. See DECISIONS.md for this module.
//
// Reuses F2's `useAnalyticsDashboard()` hook directly (same endpoint, same
// query key, no duplicate request — same precedent as F10's CRM Dashboard
// reusing F2's `useCrmDashboard()`). Does not reuse F2's `WidgetCard`/
// widget components/`PeriodSelect` (components-tree, not hooks — D-162),
// since this page needs Custom Range support F2's period control doesn't
// have; see `use-analytics-period.ts`.
export function AnalyticsDashboardPage() {
  return (
    <RefreshIntervalProvider>
      <AnalyticsDashboardPageContent />
    </RefreshIntervalProvider>
  );
}

function AnalyticsDashboardPageContent() {
  const { options } = useAnalyticsPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <AnalyticsViewGate>
      <div className="flex flex-col gap-6">
        <AnalyticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">Analytics Dashboard</h1>
          <PeriodRangeSelect />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <>
            <Section title="Business Analytics">
              <Card title="Leads">
                <Stat>{formatInteger(data.widgets.leads.totalLeads)}</Stat>
              </Card>
              <Card title="Sales (CRM Performance)">
                <Stat>{formatUsd(data.widgets.sales.totalPipelineValueUsd)}</Stat>
                <Sub>{formatPercent(data.widgets.sales.winRatePercent)} win rate</Sub>
              </Card>
              <Card title="Conversion (Growth)">
                <Stat>{formatPercent(data.widgets.conversion.overallRatePercent)}</Stat>
              </Card>
            </Section>

            <Section title="Usage Analytics">
              <Card title="AI Usage">
                <Stat>{formatInteger(data.widgets.aiUsage.totalAnalyses)}</Stat>
                <Sub>{formatInteger(data.widgets.aiUsage.totalTokens)} tokens</Sub>
              </Card>
              <Card title="AI Cost">
                <Stat>{formatUsd(data.widgets.costs.spentUsd)}</Stat>
                <Sub>{formatPercent(data.widgets.costs.percentUsed)} of ceiling</Sub>
              </Card>
              <Card title="Deployments">
                <Stat>{formatInteger(data.widgets.deployments.totalDeployments)}</Stat>
                <Sub>{formatPercent(data.widgets.deployments.successRatePercent)} success</Sub>
              </Card>
              <Card title="Website Generation">
                <Stat>{formatInteger(data.widgets.websiteStatus.totalGenerated)}</Stat>
              </Card>
            </Section>

            <Section title="System Monitoring">
              <Card title="Platform Health">
                <Stat>{formatInteger(data.widgets.systemHealth.healthy)}</Stat>
                <Sub>
                  {formatInteger(data.widgets.systemHealth.unhealthy)} unhealthy,{' '}
                  {formatInteger(data.widgets.systemHealth.unknown)} unknown
                </Sub>
              </Card>
            </Section>

            <Section title="More">
              <Link
                href="/analytics/audit"
                className="border-(--color-border-default) bg-(--color-bg-surface) text-(--color-accent) rounded-lg border p-4 text-sm font-medium hover:underline"
              >
                Audit Activity →
              </Link>
              <Link
                href="/analytics/activity"
                className="border-(--color-border-default) bg-(--color-bg-surface) text-(--color-accent) rounded-lg border p-4 text-sm font-medium hover:underline"
              >
                User Activity →
              </Link>
            </Section>
          </>
        ) : null}
      </div>
    </AnalyticsViewGate>
  );
}
