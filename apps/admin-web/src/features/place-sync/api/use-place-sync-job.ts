'use client';

import { useAuth } from '@clerk/nextjs';
import { placeSyncJobSchema, type PlaceSyncJob } from '@riznexia/shared-types';
import { useQuery, type Query, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { isTerminalPlaceSyncStatus } from '../status';

const POLL_INTERVAL_MS = 3_000;

// Progress (F5 scope): polls `GET /place-sync-jobs/:id` every 3s while
// `queued`/`running`, and stops automatically the moment the job reaches
// any of its three real terminal statuses (`completed`/`failed`/
// `partial` — DECISIONS.md, this module). Same TanStack Query
// function-form `refetchInterval` pattern as F3's `useDiscoveryJob`, no
// bespoke timer code. There is no live percentage to poll toward — the
// created/updated/failed counters are written once, at completion, not
// streamed incrementally — so this hook exists only to catch the terminal
// transition, never to animate a progress bar.
export function usePlaceSyncJob(jobId: string): UseQueryResult<PlaceSyncJob> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['place-sync-jobs', jobId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<PlaceSyncJob>(`/place-sync-jobs/${jobId}`, {
        token,
        schema: placeSyncJobSchema,
      });
    },
    refetchInterval: (query: Query<PlaceSyncJob>) => {
      const status = query.state.data?.status;
      return status && !isTerminalPlaceSyncStatus(status) ? POLL_INTERVAL_MS : false;
    },
  });
}
