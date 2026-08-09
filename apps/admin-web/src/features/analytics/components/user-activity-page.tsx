'use client';

import type { UserActivityReport } from '@riznexia/shared-types';
import { ErrorState, Skeleton } from '@riznexia/ui';
import { useAnalyticsReport } from '../api/use-analytics-report';
import { useAnalyticsPeriod } from '../use-analytics-period';
import { AnalyticsReportGate } from './analytics-report-gate';
import { AnalyticsSubNav } from './analytics-sub-nav';
import { AnalyticsViewGate } from './analytics-view-gate';
import { ExportCsvButton } from './export-csv-button';
import { PeriodRangeSelect } from './period-range-select';
import { UserActivityReportView } from './reports/user-activity-report';

// User Activity (F12): `GET /analytics/reports/user_activity` — not
// paginated (`UserActivityReport` is a single `byActor[]` breakdown, not a
// cursor list, unlike Audit). Entire page content is gated
// `analytics:report`, same as Audit Logs.
export function UserActivityPage() {
  const { options } = useAnalyticsPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsReport('user_activity', options);
  const report = data?.data as UserActivityReport | undefined;

  return (
    <AnalyticsViewGate>
      <div className="flex flex-col gap-6">
        <AnalyticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">User Activity</h1>
          <div className="flex items-center gap-3">
            <PeriodRangeSelect />
            <ExportCsvButton type="user_activity" period={options} />
          </div>
        </div>

        <AnalyticsReportGate>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : report ? (
            <UserActivityReportView data={report} />
          ) : null}
        </AnalyticsReportGate>
      </div>
    </AnalyticsViewGate>
  );
}
