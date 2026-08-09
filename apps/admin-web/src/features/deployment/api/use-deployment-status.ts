'use client';

import { useAuth } from '@clerk/nextjs';
import { deploymentStatusSchema, type DeploymentStatusSnapshot } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Deployment Dashboard (F11): `GET /leads/:id/deployment-status` — a
// computed rollup (latest WebsiteDeployment + Domain + a precomputed
// `productionReady`), never a stored table (DECISIONS.md D-... Module
// M11). Never `.nullable()` itself — the endpoint always returns a
// snapshot, with `latestDeployment`/`domain` individually nullable when
// nothing has been deployed/registered yet.
export function useDeploymentStatus(leadId: string): UseQueryResult<DeploymentStatusSnapshot> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'deployment-status'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<DeploymentStatusSnapshot>(`/leads/${leadId}/deployment-status`, {
        token,
        schema: deploymentStatusSchema,
      });
    },
  });
}
