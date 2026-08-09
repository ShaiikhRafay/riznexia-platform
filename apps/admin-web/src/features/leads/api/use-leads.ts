'use client';

import { useAuth } from '@clerk/nextjs';
import type { Lead, PipelineStage } from '@riznexia/shared-types';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedLeadsSchema } from './lead-pagination-schemas';

export interface PaginatedLeads {
  items: Lead[];
  nextCursor: string | null;
}

export interface UseLeadsParams {
  cursor?: string;
  limit?: number;
  stage?: PipelineStage;
  tag?: string;
  assignedTo?: string;
  q?: string;
  sort?: string;
}

// Lead List + Pagination (F4): `GET /leads` is genuinely cursor-paginated
// server-side (`cursor`/`nextCursor`, no `total`), unlike Discovery
// History's fixed top-50 list — so this hook feeds the shared DataTable's
// `server` pagination/sorting modes directly, one page at a time.
// `placeholderData: keepPreviousData` keeps the previous page's rows on
// screen while the next page loads, instead of a loading flash on every
// Next/Previous click.
export function useLeads(params: UseLeadsParams): UseQueryResult<PaginatedLeads> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString(params);
      return apiClient.get<PaginatedLeads>(`/leads${query}`, {
        token,
        schema: paginatedLeadsSchema,
      });
    },
    placeholderData: keepPreviousData,
  });
}
