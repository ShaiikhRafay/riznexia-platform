'use client';

import { useAuth } from '@clerk/nextjs';
import { contentManifestSchema, type ContentManifest } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Content Viewer/Dashboard (F8): `GET /leads/:id/content` — no polling,
// same deterministic-synchronous reasoning as `useLayoutConfiguration`.
export function useContentManifest(leadId: string): UseQueryResult<ContentManifest | null> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'content-manifest'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<ContentManifest | null>(`/leads/${leadId}/content`, {
        token,
        schema: contentManifestSchema.nullable(),
      });
    },
  });
}
