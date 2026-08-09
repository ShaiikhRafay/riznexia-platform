'use client';

import { useAuth } from '@clerk/nextjs';
import { leadCrmSchema, type LeadCRM, type TransitionLeadStageInput } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Stage movement (F10 Pipeline Board + Lead CRM Details): `POST
// /leads/:id/crm/stage` is a real "move to any stage" endpoint — no
// forward-only/no-skip rule exists server-side, so this backs both a
// drag-and-drop board move and an explicit stage-picker action with the
// same call. Moving into a stage with `isLost: true` requires
// `lostReasonId` in the body or the backend throws
// `LostReasonRequiredException` — the caller is responsible for prompting
// for one first (this hook does not special-case it).
export function useTransitionStage(
  leadId: string,
): UseMutationResult<LeadCRM, unknown, TransitionLeadStageInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransitionLeadStageInput) => {
      const token = await getToken();
      return apiClient.post<LeadCRM>(`/leads/${leadId}/crm/stage`, input, {
        token,
        schema: leadCrmSchema,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['leads', leadId, 'crm'], data);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'activity'] });
      void queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
    },
  });
}
