'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/src/lib/api-client';

const healthResponseSchema = z.object({ status: z.literal('ok'), timestamp: z.string() });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// System Information (F13): `GET /health` — the only real system-status
// signal the backend exposes (`@Public()`, no token needed). No version,
// build, git commit, environment, database-status, or cache-status field
// exists on this or any other endpoint — see `HealthController`
// (`apps/api/src/health/health.controller.ts`), which returns exactly
// `{status, timestamp}` (D-204). Refetches periodically so "API Status" on
// the page reflects a live check, not a stale one-time call.
export function useHealth(): UseQueryResult<HealthResponse> {
  return useQuery({
    queryKey: ['settings-health-check'],
    queryFn: async () => apiClient.get<HealthResponse>('/health', { schema: healthResponseSchema }),
    refetchInterval: 30_000,
    retry: false,
  });
}
