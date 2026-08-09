'use client';

import { useAuth } from '@clerk/nextjs';
import type { Lead } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

export interface BulkActionResult {
  succeeded: number;
  failed: number;
}

// Bulk selection (F4, founder-approved resolution): there is no bulk
// endpoint anywhere in the Leads backend (no `DELETE /leads` collection
// route) — this runs one `DELETE /leads/:id` per selected row via
// `Promise.allSettled`, not one atomic call, so a partial failure is a
// real, surfaced outcome rather than something a fake atomic wrapper
// would hide.
export function useBulkDeleteLeads(): UseMutationResult<BulkActionResult, unknown, Lead[]> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leads: Lead[]) => {
      const token = await getToken();
      const results = await Promise.allSettled(
        leads.map((lead) => apiClient.delete<void>(`/leads/${lead.id}`, { token })),
      );
      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      return { succeeded, failed: results.length - succeeded };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
