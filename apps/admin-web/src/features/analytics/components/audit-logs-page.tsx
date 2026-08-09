'use client';

import type { AuditReport } from '@riznexia/shared-types';
import { DataTable } from '@riznexia/ui';
import { useEffect, useRef, useState } from 'react';
import { useAnalyticsReport } from '../api/use-analytics-report';
import { useAnalyticsPeriod } from '../use-analytics-period';
import { AnalyticsReportGate } from './analytics-report-gate';
import { AnalyticsSubNav } from './analytics-sub-nav';
import { AnalyticsViewGate } from './analytics-view-gate';
import { ExportCsvButton } from './export-csv-button';
import { PeriodRangeSelect } from './period-range-select';
import { AUDIT_REPORT_COLUMNS } from './reports/audit-report-columns';

const PAGE_SIZE = 25;

// Audit Logs (F12): `GET /analytics/reports/audit` — real cursor
// pagination (`getAuditFacts`), same bidirectional Prev/Next-over-a-
// forward-only-cursor pattern F4's/F10's/F11's own history tables already
// established. Entire page content is gated `analytics:report` (not just
// `analytics:view`) — there is no dashboard-widget-level summary for
// audit data, only the full report.
export function AuditLogsPage() {
  const { options } = useAnalyticsPeriod();
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const periodKey = JSON.stringify(options);
  const previousPeriodKeyRef = useRef(periodKey);
  useEffect(() => {
    if (previousPeriodKeyRef.current !== periodKey) {
      previousPeriodKeyRef.current = periodKey;
      setCursorHistory([undefined]);
      setPageIndex(0);
    }
  }, [periodKey]);

  const { data, isLoading, isFetching, error, refetch } = useAnalyticsReport('audit', {
    ...options,
    cursor: cursorHistory[pageIndex],
    limit: PAGE_SIZE,
  });

  const report = data?.data as AuditReport | undefined;

  return (
    <AnalyticsViewGate>
      <div className="flex flex-col gap-6">
        <AnalyticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">Audit Logs</h1>
          <div className="flex items-center gap-3">
            <PeriodRangeSelect />
            <ExportCsvButton type="audit" period={options} />
          </div>
        </div>

        <AnalyticsReportGate>
          <DataTable
            columns={AUDIT_REPORT_COLUMNS}
            data={report?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            emptyTitle="No audit entries found"
            emptyDescription="Try adjusting the period filter."
            pagination={{
              mode: 'server',
              pageSize: PAGE_SIZE,
              hasNextPage: !!report?.nextCursor,
              hasPreviousPage: pageIndex > 0,
              onNextPage: () => {
                if (report?.nextCursor) {
                  const nextCursor = report.nextCursor;
                  setCursorHistory((prev) => [...prev.slice(0, pageIndex + 1), nextCursor]);
                  setPageIndex((index) => index + 1);
                }
              },
              onPreviousPage: () => setPageIndex((index) => Math.max(0, index - 1)),
              isFetching,
            }}
          />
        </AnalyticsReportGate>
      </div>
    </AnalyticsViewGate>
  );
}
