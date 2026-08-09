'use client';

import { useAuth } from '@clerk/nextjs';
import { layoutConfigurationSchema, type LayoutConfiguration } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Layout Viewer/Dashboard (F8): `GET /leads/:id/layout` returns the
// single latest `LayoutConfiguration` for a lead, or `null`. No
// `refetchInterval` — `generateLayout()` is explicitly documented as
// deterministic (no AI call, no randomness) and runs synchronously inside
// `POST /leads/:id/layout`, same as every M8.1-M8.4 resource — there is
// no status field anywhere in this pipeline and nothing to poll for.
export function useLayoutConfiguration(leadId: string): UseQueryResult<LayoutConfiguration | null> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'layout-configuration'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<LayoutConfiguration | null>(`/leads/${leadId}/layout`, {
        token,
        schema: layoutConfigurationSchema.nullable(),
      });
    },
  });
}
