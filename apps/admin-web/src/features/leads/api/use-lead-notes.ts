'use client';

import { useAuth } from '@clerk/nextjs';
import type { LeadNote } from '@riznexia/shared-types';
import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedLeadNotesSchema } from './lead-pagination-schemas';

interface NotesPage {
  items: LeadNote[];
  nextCursor: string | null;
}

const NOTES_PAGE_SIZE = 20;

// Notes (F4): `GET /leads/:id/notes`, newest-first, cursor-paginated.
// `useInfiniteQuery` (forward-only "Load more") rather than the list
// page's bidirectional Prev/Next — notes/activity have no Prev requirement
// in the founder's brief, just "Display"/"newest first", so the simpler
// accumulate-and-append pattern is the honest fit.
export function useLeadNotes(leadId: string): UseInfiniteQueryResult<{ pages: NotesPage[] }> {
  const { getToken } = useAuth();

  return useInfiniteQuery({
    queryKey: ['leads', leadId, 'notes'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const token = await getToken();
      const query = toQueryString({ cursor: pageParam, limit: NOTES_PAGE_SIZE });
      return apiClient.get<NotesPage>(`/leads/${leadId}/notes${query}`, {
        token,
        schema: paginatedLeadNotesSchema,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: NotesPage) => lastPage.nextCursor ?? undefined,
  });
}
