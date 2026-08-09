'use client';

import { useAuth } from '@clerk/nextjs';
import type { Lead } from '@riznexia/shared-types';
import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';

interface LeadsPage {
  items: Lead[];
  nextCursor: string | null;
}

const BOARD_PAGE_SIZE = 25;

// Pipeline Board (F10, founder-approved resolution): there is no bulk
// "leads with their CRM stage" endpoint — `GET /crm/dashboard`'s
// `pipelineValueByStage` is aggregate-only (no lead-level data), and no
// `GET /crm/leads` route exists. The founder approved a bounded,
// paginated board: leads load a page at a time via this accumulating
// `useInfiniteQuery` over the real `GET /leads` endpoint ("Load More" to
// page in further leads across all stage columns), each cross-referenced
// with a real `GET /leads/:id/crm` call (`use-board-leads-crm.ts`) rather
// than an unbounded fetch-everything pattern. See DECISIONS.md D-177.
export function useBoardLeads(): UseInfiniteQueryResult<{ pages: LeadsPage[] }> {
  const { getToken } = useAuth();

  return useInfiniteQuery({
    queryKey: ['crm-board-leads'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const token = await getToken();
      const query = toQueryString({ cursor: pageParam, limit: BOARD_PAGE_SIZE });
      return apiClient.get<LeadsPage>(`/leads${query}`, { token });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: LeadsPage) => lastPage.nextCursor ?? undefined,
  });
}
