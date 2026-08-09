'use client';

import { useAuth } from '@clerk/nextjs';
import { leadSchema, type Lead } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Lead Details (F4): `GET /leads/:id` — see `dto/lead-response.dto.ts`'s
// `toLeadResponse()` for the exact, curated field set this returns
// (verified directly, not assumed); this hook fetches exactly that, no
// more.
export function useLead(leadId: string): UseQueryResult<Lead> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<Lead>(`/leads/${leadId}`, { token, schema: leadSchema });
    },
  });
}
