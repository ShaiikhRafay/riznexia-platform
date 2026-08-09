'use client';

import { useAuth } from '@clerk/nextjs';
import { componentManifestSchema, type ComponentManifest } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Component Viewer/Dashboard (F8): `GET /leads/:id/components` — no
// polling, same deterministic-synchronous reasoning as
// `useLayoutConfiguration`.
export function useComponentManifest(leadId: string): UseQueryResult<ComponentManifest | null> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'component-manifest'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<ComponentManifest | null>(`/leads/${leadId}/components`, {
        token,
        schema: componentManifestSchema.nullable(),
      });
    },
  });
}
