'use client';

import { useAuth } from '@clerk/nextjs';
import type { CrmTask, TaskStatus } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedCrmTasksSchema } from './crm-pagination-schemas';

export interface PaginatedCrmTasks {
  items: CrmTask[];
  nextCursor: string | null;
}

// Tasks (F10 Lead CRM Details): `GET /leads/:id/tasks` — per-lead,
// cursor-paginated, filterable by status.
export function useLeadTasks(
  leadId: string,
  status?: TaskStatus,
): UseQueryResult<PaginatedCrmTasks> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'tasks', status],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString({ status, limit: 25 });
      return apiClient.get<PaginatedCrmTasks>(`/leads/${leadId}/tasks${query}`, {
        token,
        schema: paginatedCrmTasksSchema,
      });
    },
  });
}
