'use client';

import { useAuth } from '@clerk/nextjs';
import { domainSchema, type Domain } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/src/lib/api-client';

// Domain Management (F11): `GET /leads/:id/domains` — a plain array, not
// cursor-paginated (a hostname is a mutable, long-lived pointer, not
// immutable history — DECISIONS.md D-096 — so the list is expected to
// stay small).
export function useDomains(leadId: string): UseQueryResult<Domain[]> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'domains'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<Domain[]>(`/leads/${leadId}/domains`, {
        token,
        schema: z.array(domainSchema),
      });
    },
  });
}
