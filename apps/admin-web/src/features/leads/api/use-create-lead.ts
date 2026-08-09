'use client';

import { useAuth } from '@clerk/nextjs';
import { leadSchema, type CreateLeadInput, type Lead } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Create Lead (F4): `POST /leads`, exactly `createLeadSchema`'s shape —
// `businessId` plus optional `pipelineStage`/`assignedTo`/`tags`. There is
// no endpoint to create a lead from inline business fields — a Lead is
// always the pursuit of an existing Business row (DECISIONS.md D-030).
export function useCreateLead(): UseMutationResult<Lead, unknown, CreateLeadInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      const token = await getToken();
      return apiClient.post<Lead>('/leads', input, { token, schema: leadSchema });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
