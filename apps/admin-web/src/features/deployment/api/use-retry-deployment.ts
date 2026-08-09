'use client';

import { useAuth } from '@clerk/nextjs';
import { websiteDeploymentSchema, type WebsiteDeployment } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Deployment Details (F11): `POST /leads/:id/deployments/:deploymentId/retry`
// — re-deploys a FAILED target as a new row (`retryOfDeploymentId` set),
// gated `deployment:create` (same permission as a fresh deploy — "start a
// new deployment attempt"). The backend rejects a non-FAILED target with
// `DEPLOYMENT_NOT_RETRYABLE`; never pre-checked here.
export function useRetryDeployment(
  leadId: string,
  deploymentId: string,
): UseMutationResult<WebsiteDeployment, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<WebsiteDeployment>(
        `/leads/${leadId}/deployments/${deploymentId}/retry`,
        undefined,
        {
          token,
          schema: websiteDeploymentSchema,
        },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'deployment-status'] });
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'deployments'] });
    },
  });
}
