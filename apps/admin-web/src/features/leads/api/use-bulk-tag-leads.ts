'use client';

import { useAuth } from '@clerk/nextjs';
import type { Lead } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import type { BulkActionResult } from './use-bulk-delete-leads';

export interface BulkTagVariables {
  leads: Lead[];
  tag: string;
}

// Bulk "add tag" (F4, founder-approved resolution): same "no bulk
// endpoint, N sequential requests" pattern as bulk delete. `PATCH
// /leads/:id`'s `tags` field *replaces* the array (it's not an append
// endpoint), so each row's next tag set is computed client-side from that
// row's own already-loaded `tags` — no extra read per lead needed, the
// selected rows already carry their current tags from the list query.
export function useBulkTagLeads(): UseMutationResult<BulkActionResult, unknown, BulkTagVariables> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leads, tag }: BulkTagVariables) => {
      const token = await getToken();
      const results = await Promise.allSettled(
        leads.map((lead) => {
          const nextTags = lead.tags.includes(tag) ? lead.tags : [...lead.tags, tag];
          return apiClient.patch<Lead>(`/leads/${lead.id}`, { tags: nextTags }, { token });
        }),
      );
      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      return { succeeded, failed: results.length - succeeded };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
