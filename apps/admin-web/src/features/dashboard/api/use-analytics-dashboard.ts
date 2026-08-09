'use client';

import { useAuth } from '@clerk/nextjs';
import {
  analyticsDashboardSchema,
  type AggregationPeriod,
  type AnalyticsDashboard,
} from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { useQueryRefetchInterval } from '../refresh-interval';

export interface UseAnalyticsDashboardOptions {
  period: AggregationPeriod;
  fromDate?: string;
  toDate?: string;
}

// Widgets registry (widget-registry.tsx) — every M12 widget component
// calls this same hook; TanStack Query dedupes by query key, so eight
// components subscribing to it is one network request, not eight
// (frontend architecture review §9's "one apiClient call site per
// feature," extended here to "one query per feature, many readers").
export function useAnalyticsDashboard(
  options: UseAnalyticsDashboardOptions,
): UseQueryResult<AnalyticsDashboard> {
  const { getToken } = useAuth();
  const refetchInterval = useQueryRefetchInterval();

  return useQuery({
    queryKey: ['analytics-dashboard', options],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<AnalyticsDashboard>(`/analytics/dashboard${toQueryString(options)}`, {
        token,
        schema: analyticsDashboardSchema,
      });
    },
    refetchInterval,
  });
}
