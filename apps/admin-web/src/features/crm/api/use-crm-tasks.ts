'use client';

import { useAuth } from '@clerk/nextjs';
import type { CrmTask, TaskStatus } from '@riznexia/shared-types';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedCrmTasksSchema } from './crm-pagination-schemas';

export interface PaginatedCrmTasks {
  items: CrmTask[];
  nextCursor: string | null;
}

export interface UseCrmTasksParams {
  cursor?: string;
  limit?: number;
  assignedToId?: string;
  status?: TaskStatus;
  dueBefore?: string;
  dueAfter?: string;
}

// Tasks — List (F10): `GET /crm/tasks` is genuinely cross-lead and
// cursor-paginated server-side, the same shape F4's `useLeads()` feeds
// into the shared DataTable's `server` pagination mode.
export function useCrmTasks(params: UseCrmTasksParams): UseQueryResult<PaginatedCrmTasks> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['crm-tasks', params],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString(params);
      return apiClient.get<PaginatedCrmTasks>(`/crm/tasks${query}`, {
        token,
        schema: paginatedCrmTasksSchema,
      });
    },
    placeholderData: keepPreviousData,
  });
}
