'use client';

import { useAuth } from '@clerk/nextjs';
import type { SalesProposal } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedSalesProposalsSchema } from './crm-pagination-schemas';

export interface PaginatedSalesProposals {
  items: SalesProposal[];
  nextCursor: string | null;
}

// Proposals (F10): `GET /leads/:id/proposals` — per-lead only, no global
// list exists. Cursor-paginated, `orderBy version desc` server-side.
export function useLeadProposals(leadId: string): UseQueryResult<PaginatedSalesProposals> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'proposals'],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString({ limit: 25 });
      return apiClient.get<PaginatedSalesProposals>(`/leads/${leadId}/proposals${query}`, {
        token,
        schema: paginatedSalesProposalsSchema,
      });
    },
  });
}
