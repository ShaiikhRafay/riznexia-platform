'use client';

import { useAuth } from '@clerk/nextjs';
import { websiteDeploymentSchema, type WebsiteDeployment } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Deployment Details (F11): `GET /leads/:id/deployments/:deploymentId` —
// returns every field of the immutable WebsiteDeployment row (no PATCH/
// DELETE exists for this resource — founder's explicit Decision 3).
export function useDeployment(
  leadId: string,
  deploymentId: string,
): UseQueryResult<WebsiteDeployment> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'deployments', deploymentId],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<WebsiteDeployment>(`/leads/${leadId}/deployments/${deploymentId}`, {
        token,
        schema: websiteDeploymentSchema,
      });
    },
  });
}
