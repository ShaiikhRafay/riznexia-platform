'use client';

import { useAuth } from '@clerk/nextjs';
import { placeSyncJobSchema, type PlaceSyncJob } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/src/lib/api-client';

// `GET /place-sync-jobs` accepts no query parameters and returns a fixed
// top-50 list (`orderBy createdAt desc, take: 50` server-side, verified
// directly against apps/api/src/place-sync/place-sync.service.ts) — the
// exact same pagination shape as `GET /discovery-jobs`. No cursor, no
// page param, no total count exist for this endpoint, which is why Sync
// Job History pages this client-side rather than requesting a server
// page.
export function usePlaceSyncJobs(): UseQueryResult<PlaceSyncJob[]> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['place-sync-jobs'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<PlaceSyncJob[]>('/place-sync-jobs', {
        token,
        schema: z.array(placeSyncJobSchema),
      });
    },
  });
}
