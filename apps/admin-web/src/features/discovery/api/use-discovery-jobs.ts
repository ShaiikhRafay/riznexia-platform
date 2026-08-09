'use client';

import { useAuth } from '@clerk/nextjs';
import { discoveryJobSchema, type DiscoveryJob } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/src/lib/api-client';

// `GET /discovery-jobs` accepts no query parameters and returns a fixed
// top-50 list (`orderBy createdAt desc, take: 50` server-side) — verified
// directly against apps/api/src/discovery/discovery.service.ts, not
// assumed. No cursor, no page param, no total count exist for this
// endpoint, which is why Discovery History (data-table usage) pages this
// client-side rather than requesting a server page (approved F3
// architecture's own resolution, not an oversight).
export function useDiscoveryJobs(): UseQueryResult<DiscoveryJob[]> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['discovery-jobs'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<DiscoveryJob[]>('/discovery-jobs', {
        token,
        schema: z.array(discoveryJobSchema),
      });
    },
  });
}
