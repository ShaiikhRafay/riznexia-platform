'use client';

import { useAuth } from '@clerk/nextjs';
import { businessAnalysisSchema, type BusinessAnalysis } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Run/Re-run Analysis (F6): `POST /leads/:id/business` takes no request
// body — verified directly against the controller (`@Post()` with no
// `@Body()` parameter). The backend never rejects a re-run based on the
// existing analysis's status (verified against
// `business-analysis.service.ts`'s `triggerAnalysis()`): it either
// returns the existing COMPLETED row unchanged (a cache hit — the
// business's fingerprint hasn't changed since the last completed
// analysis) or creates a new, incremented-version PENDING row and
// dispatches the AI runner (a cache miss). There is no backend-side
// "only re-run if failed" restriction, so this is the single mutation
// both "Run AI Analysis" (no prior analysis) and "Re-run Analysis" (one
// already exists) call — the button's own label is the only thing that
// changes, not the request.
//
// Cache status is inferable from the response body itself, not a
// dedicated field: a cache hit's response already has `status:
// 'completed'` the instant it's returned (no pending phase was ever
// observed by the caller); a cache miss's response has `status:
// 'pending'`. The backend's real `cacheHit` boolean only ever
// distinguishes the HTTP status code (200 vs 202) internally — it is
// never serialized into the JSON body — so callers infer cache status
// from `status` on the mutation's own result, right after triggering,
// rather than reading a field that doesn't exist (see
// DECISIONS.md for this module).
export function useTriggerBusinessAnalysis(
  leadId: string,
): UseMutationResult<BusinessAnalysis, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<BusinessAnalysis>(`/leads/${leadId}/business`, undefined, {
        token,
        schema: businessAnalysisSchema,
      });
    },
    onSuccess: (analysis) => {
      queryClient.setQueryData(['leads', leadId, 'business-analysis'], analysis);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'business-analysis'] });
    },
  });
}
