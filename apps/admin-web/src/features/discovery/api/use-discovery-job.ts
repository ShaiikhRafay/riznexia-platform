'use client';

import { useAuth } from '@clerk/nextjs';
import { discoveryJobSchema, type DiscoveryJob } from '@riznexia/shared-types';
import { useQuery, type Query, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { isTerminalDiscoveryStatus } from '../status';

const POLL_INTERVAL_MS = 3_000;

// Discovery Progress (approved F3 architecture): status-based, not
// percentage-based — `resultsCount` is only written once, at completion
// (verified against discovery-runner.service.ts, never incremented
// mid-run), so there is no real progress fraction to poll for. This hook
// polls `GET /discovery-jobs/:id` every 3s while the job is `queued`/
// `running`, and stops automatically the moment it reaches a terminal
// status — TanStack Query's own function form of `refetchInterval`, no
// bespoke timer/interval code.
export function useDiscoveryJob(jobId: string): UseQueryResult<DiscoveryJob> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['discovery-jobs', jobId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<DiscoveryJob>(`/discovery-jobs/${jobId}`, {
        token,
        schema: discoveryJobSchema,
      });
    },
    refetchInterval: (query: Query<DiscoveryJob>) => {
      const status = query.state.data?.status;
      return status && !isTerminalDiscoveryStatus(status) ? POLL_INTERVAL_MS : false;
    },
  });
}
