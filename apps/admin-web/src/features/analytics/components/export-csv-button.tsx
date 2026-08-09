'use client';

import type { ReportType } from '@riznexia/shared-types';
import { Button, toast } from '@riznexia/ui';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useExportReport } from '../api/use-export-report';
import type { AnalyticsPeriodOptions } from '../use-analytics-period';

export interface ExportCsvButtonProps {
  type: ReportType;
  period: AnalyticsPeriodOptions;
}

// Exports (F12): "Support only the formats implemented by backend. Do not
// fake unavailable formats." CSV is the only implemented format — PDF/
// Excel are real, closed-enum values the backend accepts but rejects with
// `EXPORT_FORMAT_NOT_IMPLEMENTED`, so this button never offers them as a
// choice at all, rather than shipping a selector that always errors.
// Gated `analytics:export`, distinct from `analytics:report`.
export function ExportCsvButton({ type, period }: ExportCsvButtonProps) {
  const exportReport = useExportReport(type);

  function handleExport() {
    exportReport
      .mutateAsync({ period: period.period, fromDate: period.fromDate, toDate: period.toDate })
      .then(() => toast.success('Export downloaded'))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : 'Could not export this report.';
        toast.error(message);
      });
  }

  return (
    <PermissionGate permission="analytics:export">
      <Button size="sm" variant="secondary" onClick={handleExport} loading={exportReport.isPending}>
        Export CSV
      </Button>
    </PermissionGate>
  );
}
