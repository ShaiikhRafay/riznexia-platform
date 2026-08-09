'use client';

import type { ReportType } from '@riznexia/shared-types';
import { ErrorState, Skeleton } from '@riznexia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAnalyticsReport } from '../api/use-analytics-report';
import { REPORT_TYPE_OPTIONS } from '../report-labels';
import { useAnalyticsPeriod } from '../use-analytics-period';
import { AnalyticsReportGate } from './analytics-report-gate';
import { AnalyticsSubNav } from './analytics-sub-nav';
import { AnalyticsViewGate } from './analytics-view-gate';
import { ExportCsvButton } from './export-csv-button';
import { PeriodRangeSelect } from './period-range-select';
import { ReportView } from './reports/report-view';

const DEFAULT_TYPE: ReportType = 'lead_funnel';

function isReportType(value: string | null): value is ReportType {
  return value !== null && REPORT_TYPE_OPTIONS.some((option) => option.value === value);
}

// Analytics Reports (F12): "Implement pages for all backend reports."
// Covers all fifteen real `REPORT_TYPES` via a single selector — the
// founder's own Reports list named fifteen reports too, but three of
// those names ("Business Growth", "API Usage Report", "Preview Report")
// have no backend report type or data source at all, so they are not
// selectable options here (DECISIONS.md for this module). The selected
// type lives in the URL (`?type=`), bookmarkable/reload-safe, same
// pattern as every prior module's own Select-Lead/period state.
export function AnalyticsReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const type = isReportType(typeParam) ? typeParam : DEFAULT_TYPE;
  const { options } = useAnalyticsPeriod();

  function selectType(next: ReportType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', next);
    router.push(`?${params.toString()}`);
  }

  const { data, isLoading, error, refetch } = useAnalyticsReport(type, options);

  return (
    <AnalyticsViewGate>
      <div className="flex flex-col gap-6">
        <AnalyticsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Analytics Reports</h1>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="text-(--color-text-primary) flex items-center gap-2 text-sm">
            Report
            <select
              value={type}
              onChange={(event) => selectType(event.target.value as ReportType)}
              className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              {REPORT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <PeriodRangeSelect />
            <ExportCsvButton type={type} period={options} />
          </div>
        </div>

        <AnalyticsReportGate>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : data ? (
            <ReportView envelope={data} />
          ) : null}
        </AnalyticsReportGate>
      </div>
    </AnalyticsViewGate>
  );
}
