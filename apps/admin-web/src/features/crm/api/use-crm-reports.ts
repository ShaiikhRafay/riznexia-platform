'use client';

import { useAuth } from '@clerk/nextjs';
import { dashboardStatsSchema, type DashboardStats } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';

export interface UseCrmReportsParams {
  fromDate?: string;
  toDate?: string;
  ownerId?: string;
}

// Reports (F10): the exact same `GET /crm/dashboard` endpoint the CRM
// Dashboard page uses (F2's `useCrmDashboard()`), but with real
// `fromDate`/`toDate`/`ownerId` query params — `DashboardQuery` supports
// all three, but F2's own hook deliberately never wires them up (its own
// comment: mapping a period selector onto a date range would invent a
// relationship the backend doesn't define). Reports is the natural place
// for an explicit date-range control instead, since it's real backend
// query support, not an invented one. Distinct query key from
// `['crm-dashboard']` so the two pages cache independently.
export function useCrmReports(params: UseCrmReportsParams): UseQueryResult<DashboardStats> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['crm-dashboard', 'reports', params],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString(params);
      return apiClient.get<DashboardStats>(`/crm/dashboard${query}`, {
        token,
        schema: dashboardStatsSchema,
      });
    },
  });
}
