'use client';

import { useAuth } from '@clerk/nextjs';
import { websiteDeploymentSchema, type WebsiteDeployment } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Deployment Details (F11): `POST
// /leads/:id/deployments/:deploymentId/rollback` — rolls back TO the
// deployment named by `deploymentId` (must be a previous COMPLETED +
// HEALTHY one), gated `deployment:rollback` — a dedicated, more
// restricted permission than `deployment:create` (manager-and-up only, per
// the real role grants). The backend rejects an ineligible target with
// `INVALID_ROLLBACK_TARGET`; never pre-checked here beyond mirroring the
// same eligibility rule to decide whether to show the action at all (see
// Rollback Availability in DECISIONS.md).
export function useRollbackDeployment(
  leadId: string,
  deploymentId: string,
): UseMutationResult<WebsiteDeployment, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<WebsiteDeployment>(
        `/leads/${leadId}/deployments/${deploymentId}/rollback`,
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
