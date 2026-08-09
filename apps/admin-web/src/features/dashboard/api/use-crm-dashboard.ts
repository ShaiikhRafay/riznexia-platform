'use client';

import { useAuth } from '@clerk/nextjs';
import { dashboardStatsSchema, type DashboardStats } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { useQueryRefetchInterval } from '../refresh-interval';

// `GET /crm/dashboard` (M10) has no `period`/aggregation-bucket concept of
// its own — just an optional `fromDate`/`toDate` range, defaulting to
// all-time when omitted (`ReportingService.getDashboardStats()`'s own
// default). The toolbar's period selector deliberately does not drive
// this query — mapping "monthly" onto a date range would be inventing a
// relationship the backend contract doesn't define.
export function useCrmDashboard(): UseQueryResult<DashboardStats> {
  const { getToken } = useAuth();
  const refetchInterval = useQueryRefetchInterval();

  return useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<DashboardStats>('/crm/dashboard', {
        token,
        schema: dashboardStatsSchema,
      });
    },
    refetchInterval,
  });
}
