'use client';

import { useAuth } from '@clerk/nextjs';
import { generatedWebsiteSchema, type GeneratedWebsite } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Generated Website Overview/Dashboard (F8): `GET /leads/:id/website` —
// no polling, same deterministic-synchronous reasoning as the other three
// resources in this pipeline.
export function useGeneratedWebsite(leadId: string): UseQueryResult<GeneratedWebsite | null> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'generated-website'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<GeneratedWebsite | null>(`/leads/${leadId}/website`, {
        token,
        schema: generatedWebsiteSchema.nullable(),
      });
    },
  });
}
