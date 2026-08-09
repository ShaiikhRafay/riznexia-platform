'use client';

import { useAuth } from '@clerk/nextjs';
import { domainSchema, type Domain } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Domain Management (F11): `POST /leads/:id/domains/:domainId/verify` —
// triggers a (re-)verification attempt, gated `deployment:manage`. No DNS
// automation happens on either side of this call — the backend's own
// Decision 6 is metadata/provider-status only.
export function useVerifyDomain(
  leadId: string,
  domainId: string,
): UseMutationResult<Domain, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<Domain>(`/leads/${leadId}/domains/${domainId}/verify`, undefined, {
        token,
        schema: domainSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'domains'] });
    },
  });
}
