'use client';

import { useAuth } from '@clerk/nextjs';
import { deploymentHealthCheckSchema, type DeploymentHealthCheck } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Health Monitoring (F11): `POST
// /leads/:id/deployments/:deploymentId/health-check` — "Run Health Check",
// gated `deployment:manage`. The check itself is a plain HTTP request
// against the deployment's own `liveUrl` (independent of any deployment
// provider — founder's Decision 5); this hook never computes a verdict
// itself, it only triggers the backend's real check and reflects its real
// result.
export function useTriggerHealthCheck(
  leadId: string,
  deploymentId: string,
): UseMutationResult<DeploymentHealthCheck, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<DeploymentHealthCheck>(
        `/leads/${leadId}/deployments/${deploymentId}/health-check`,
        undefined,
        {
          token,
          schema: deploymentHealthCheckSchema,
        },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'deployments', deploymentId, 'health'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['leads', leadId, 'deployments', deploymentId],
      });
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'deployment-status'] });
    },
  });
}
