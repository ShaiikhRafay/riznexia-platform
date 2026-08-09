'use client';

import { useAuth } from '@clerk/nextjs';
import { leadSchema, type Lead, type UpdateLeadInput } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

export interface UpdateLeadVariables {
  leadId: string;
  input: UpdateLeadInput;
}

// Edit Lead (F4): `PATCH /leads/:id`, exactly `updateLeadSchema`'s PATCH
// semantics — every field optional but at least one required, `assignedTo:
// null` explicitly unassigns while omitting it leaves assignment
// untouched. Invalidates both the list (a stage/tag/assignment change can
// affect filtered results) and this lead's own detail query.
export function useUpdateLead(): UseMutationResult<Lead, unknown, UpdateLeadVariables> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, input }: UpdateLeadVariables) => {
      const token = await getToken();
      return apiClient.patch<Lead>(`/leads/${leadId}`, input, { token, schema: leadSchema });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
