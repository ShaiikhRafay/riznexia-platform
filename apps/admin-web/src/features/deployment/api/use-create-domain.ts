'use client';

import { useAuth } from '@clerk/nextjs';
import { domainSchema, type CreateDomainInput, type Domain } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Domain Management (F11): `POST /leads/:id/domains` — register a
// hostname, gated `deployment:manage`. `provider` is deliberately not a
// client input (server-set from whichever provider is actually wired up)
// — same reasoning as `createWebsiteDeploymentSchema` omitting one.
export function useCreateDomain(
  leadId: string,
): UseMutationResult<Domain, unknown, CreateDomainInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDomainInput) => {
      const token = await getToken();
      return apiClient.post<Domain>(`/leads/${leadId}/domains`, input, {
        token,
        schema: domainSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'domains'] });
    },
  });
}
