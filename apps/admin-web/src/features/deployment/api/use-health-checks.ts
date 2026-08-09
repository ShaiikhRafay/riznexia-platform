'use client';

import { useAuth } from '@clerk/nextjs';
import type { DeploymentHealthCheck } from '@riznexia/shared-types';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedDeploymentHealthChecksSchema } from './deployment-pagination-schemas';

export interface PaginatedDeploymentHealthChecks {
  items: DeploymentHealthCheck[];
  nextCursor: string | null;
}

export interface UseHealthChecksParams {
  cursor?: string;
  limit?: number;
}

// Health Monitoring (F11): `GET /leads/:id/deployments/:deploymentId/health`
// — one row per check *run* (not folded into WebsiteDeployment — a
// deployment can be checked repeatedly over its lifetime), cursor-paginated
// server-side, newest-first.
export function useHealthChecks(
  leadId: string,
  deploymentId: string,
  params: UseHealthChecksParams,
): UseQueryResult<PaginatedDeploymentHealthChecks> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'deployments', deploymentId, 'health', params],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString(params);
      return apiClient.get<PaginatedDeploymentHealthChecks>(
        `/leads/${leadId}/deployments/${deploymentId}/health${query}`,
        { token, schema: paginatedDeploymentHealthChecksSchema },
      );
    },
    placeholderData: keepPreviousData,
  });
}
