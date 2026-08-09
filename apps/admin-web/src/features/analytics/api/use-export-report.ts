'use client';

import { useAuth } from '@clerk/nextjs';
import type { ReportType } from '@riznexia/shared-types';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';

export interface ExportReportInput {
  period: string;
  fromDate?: string;
  toDate?: string;
}

// Analytics Reports (F12): `GET /analytics/reports/:type/export?format=csv`
// — the only real, implemented export format (`format` is never a client
// choice here: PDF/Excel reject with `EXPORT_FORMAT_NOT_IMPLEMENTED`
// server-side, so this hook never offers them — DECISIONS.md for this
// module). The response is plain CSV text, not JSON, so no schema is
// passed. Triggers a real browser download of the exact bytes the backend
// returned — never a client-reformatted copy.
export function useExportReport(
  type: ReportType,
): UseMutationResult<void, unknown, ExportReportInput> {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (input: ExportReportInput) => {
      const token = await getToken();
      const query = toQueryString({ ...input, format: 'csv' });
      const content = await apiClient.get<string>(`/analytics/reports/${type}/export${query}`, {
        token,
      });

      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-${input.period}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}
