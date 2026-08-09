'use client';

import { useAuth } from '@clerk/nextjs';
import type { CrmTask } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { useCurrentUser } from '@/src/lib/current-user-context';
import { toQueryString } from '@/src/lib/query-string';
import { useQueryRefetchInterval } from '../refresh-interval';

export interface PaginatedCrmTasks {
  items: CrmTask[];
  nextCursor: string | null;
}

const MY_WORK_LIMIT = 5;

// The `sales_executive` fallback (§ open question 1 of the F2 architecture
// proposal, resolved as approved): a role holding neither `analytics:view`
// nor `crm:report` gets no aggregate dashboard, but does hold `crm:view` —
// the same permission `GET /crm/tasks` is already gated on — so a short,
// un-totaled worklist of their own tasks is real, reachable data, not an
// invented endpoint. Uses `useCurrentUser()` (already in context, no
// extra `/me` call) to filter by `assignedToId`.
export function useMyTasks(): UseQueryResult<PaginatedCrmTasks> {
  const { getToken } = useAuth();
  const currentUser = useCurrentUser();
  const refetchInterval = useQueryRefetchInterval();

  return useQuery({
    queryKey: ['crm-tasks', 'assigned-to-me', currentUser.id],
    queryFn: async () => {
      const token = await getToken();
      const query = toQueryString({ assignedToId: currentUser.id, limit: MY_WORK_LIMIT });
      return apiClient.get<PaginatedCrmTasks>(`/crm/tasks${query}`, { token });
    },
    refetchInterval,
  });
}
