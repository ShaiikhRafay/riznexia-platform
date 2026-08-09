'use client';

import { useAuth } from '@clerk/nextjs';
import { businessAnalysisSchema, type BusinessAnalysis } from '@riznexia/shared-types';
import { useQuery, type Query, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { isTerminalAnalysisStatus } from '../status';

const POLL_INTERVAL_MS = 3_000;

// Business Analysis Dashboard/Details (F6): `GET /leads/:id/business`
// returns the single LATEST `BusinessAnalysis` for a lead's business, or
// `null` if none has ever been triggered (verified directly against
// `findLatestForLead()` — there is no history/versions endpoint anywhere
// in this module, so this is the only read path that exists).
//
// Polling: the AI call is fire-and-forget from `POST`'s perspective — the
// trigger endpoint returns immediately with `status: 'pending'` on a
// cache miss, and the row is updated to `completed`/`failed` only once
// the async runner finishes. Same function-form `refetchInterval` pattern
// as Discovery/Place Sync's polling hooks, gated on the one real
// non-terminal status this module has (`pending`).
export function useBusinessAnalysis(leadId: string): UseQueryResult<BusinessAnalysis | null> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'business-analysis'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<BusinessAnalysis | null>(`/leads/${leadId}/business`, {
        token,
        schema: businessAnalysisSchema.nullable(),
      });
    },
    refetchInterval: (query: Query<BusinessAnalysis | null>) => {
      const status = query.state.data?.status;
      return status && !isTerminalAnalysisStatus(status) ? POLL_INTERVAL_MS : false;
    },
  });
}
