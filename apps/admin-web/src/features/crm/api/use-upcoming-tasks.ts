'use client';

import { useAuth } from '@clerk/nextjs';
import type { CrmTask } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { toQueryString } from '@/src/lib/query-string';
import { paginatedCrmTasksSchema } from './crm-pagination-schemas';

export interface PaginatedCrmTasks {
  items: CrmTask[];
  nextCursor: string | null;
}

const UPCOMING_WINDOW_DAYS = 7;
const UPCOMING_LIMIT = 10;

// CRM Dashboard's "Upcoming Tasks" (F10): `DashboardStats` has no tasks
// field at all (confirmed against `dashboard-stats.ts`) — this is a real,
// separate `GET /crm/tasks?status=pending&dueBefore=<+7d>` call, the same
// "combine two already-reviewed endpoints for one page" pattern F8's
// D-169 established, not an invented dashboard field.
export function useUpcomingTasks(): UseQueryResult<PaginatedCrmTasks> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['crm-tasks', 'upcoming'],
    queryFn: async () => {
      const token = await getToken();
      const dueBefore = new Date(
        Date.now() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      const query = toQueryString({ status: 'pending', dueBefore, limit: UPCOMING_LIMIT });
      return apiClient.get<PaginatedCrmTasks>(`/crm/tasks${query}`, {
        token,
        schema: paginatedCrmTasksSchema,
      });
    },
  });
}
