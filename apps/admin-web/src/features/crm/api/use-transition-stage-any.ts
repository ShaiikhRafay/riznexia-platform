'use client';

import { useAuth } from '@clerk/nextjs';
import { leadCrmSchema, type LeadCRM, type TransitionLeadStageInput } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { leadCrmQueryKey } from './use-lead-crm';

export interface TransitionStageAnyInput extends TransitionLeadStageInput {
  leadId: string;
}

// Pipeline Board's own variant of `useTransitionStage` (F10): the board
// moves leads whose identity isn't known until a drag/drop or a card's own
// stage-picker fires, so `leadId` travels with the mutate call instead of
// being bound at hook-call time — calling `useTransitionStage(leadId)`
// once per card would call a hook conditionally/dynamically as the
// board's lead set changes, violating the Rules of Hooks. One hook
// instance, called unconditionally, backs every card on the board.
export function useTransitionStageAny(): UseMutationResult<
  LeadCRM,
  unknown,
  TransitionStageAnyInput
> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, ...input }: TransitionStageAnyInput) => {
      const token = await getToken();
      return apiClient.post<LeadCRM>(`/leads/${leadId}/crm/stage`, input, {
        token,
        schema: leadCrmSchema,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(leadCrmQueryKey(variables.leadId), data);
      void queryClient.invalidateQueries({ queryKey: ['leads', variables.leadId, 'activity'] });
      void queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] });
    },
  });
}
