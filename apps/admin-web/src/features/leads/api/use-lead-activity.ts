'use client';

import { useAuth } from '@clerk/nextjs';
import type { LeadActivity } from '@riznexia/shared-types';
import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedLeadActivitySchema } from './lead-pagination-schemas';

interface ActivityPage {
  items: LeadActivity[];
  nextCursor: string | null;
}

const ACTIVITY_PAGE_SIZE = 20;

// Activity Timeline (F4): `GET /leads/:id/activity` — read-only from the
// frontend (no write endpoint exists; every entry is written server-side
// as a side effect of other operations), newest-first, cursor-paginated.
export function useLeadActivity(leadId: string): UseInfiniteQueryResult<{ pages: ActivityPage[] }> {
  const { getToken } = useAuth();

  return useInfiniteQuery({
    queryKey: ['leads', leadId, 'activity'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const token = await getToken();
      const query = toQueryString({ cursor: pageParam, limit: ACTIVITY_PAGE_SIZE });
      return apiClient.get<ActivityPage>(`/leads/${leadId}/activity${query}`, {
        token,
        schema: paginatedLeadActivitySchema,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ActivityPage) => lastPage.nextCursor ?? undefined,
  });
}
