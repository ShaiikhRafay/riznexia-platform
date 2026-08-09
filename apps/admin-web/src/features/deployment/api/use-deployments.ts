'use client';

import { useAuth } from '@clerk/nextjs';
import type { WebsiteDeployment } from '@riznexia/shared-types';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedWebsiteDeploymentsSchema } from './deployment-pagination-schemas';

export interface PaginatedWebsiteDeployments {
  items: WebsiteDeployment[];
  nextCursor: string | null;
}

export interface UseDeploymentsParams {
  cursor?: string;
  limit?: number;
}

// Deployment History (F11): `GET /leads/:id/deployments` — cursor-paginated
// server-side, newest-`deploymentVersion`-first (verified against
// `deployment-engine.controller.ts`/e2e spec), same shape F10's
// `useCrmTasks()` feeds into the shared DataTable's `server` pagination
// mode.
export function useDeployments(
  leadId: string,
  params: UseDeploymentsParams,
): UseQueryResult<PaginatedWebsiteDeployments> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'deployments', params],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString(params);
      return apiClient.get<PaginatedWebsiteDeployments>(`/leads/${leadId}/deployments${query}`, {
        token,
        schema: paginatedWebsiteDeploymentsSchema,
      });
    },
    placeholderData: keepPreviousData,
  });
}
