'use client';

import { useAuth } from '@clerk/nextjs';
import {
  analyticsReportEnvelopeSchema,
  type AnalyticsReportEnvelope,
  type ReportType,
} from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';

export interface UseAnalyticsReportParams {
  period: string;
  fromDate?: string;
  toDate?: string;
  cursor?: string;
  limit?: number;
}

// Analytics Reports (F12): `GET /analytics/reports/:type` — the Reporting
// Engine's per-report drill-down, gated `analytics:report`. `data` is
// `unknown` on the wire (each of the fifteen report types has its own
// shape); callers narrow it themselves via `report-view.tsx`'s per-type
// switch, never guessed at here.
export function useAnalyticsReport(
  type: ReportType,
  params: UseAnalyticsReportParams,
): UseQueryResult<AnalyticsReportEnvelope> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['analytics-report', type, params],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString(params);
      return apiClient.get<AnalyticsReportEnvelope>(`/analytics/reports/${type}${query}`, {
        token,
        schema: analyticsReportEnvelopeSchema,
      });
    },
  });
}
