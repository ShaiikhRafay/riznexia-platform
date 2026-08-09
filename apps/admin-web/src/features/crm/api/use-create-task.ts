'use client';

import { useAuth } from '@clerk/nextjs';
import { crmTaskSchema, type CreateCrmTaskInput, type CrmTask } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Tasks — Create (F10): `POST /leads/:id/tasks` — writes no `LeadActivity`
// row (deliberate backend design: task creation is excluded from the
// unified timeline), so only the tasks caches are invalidated, not
// `['leads', leadId, 'activity']`.
export function useCreateTask(
  leadId: string,
): UseMutationResult<CrmTask, unknown, CreateCrmTaskInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCrmTaskInput) => {
      const token = await getToken();
      return apiClient.post<CrmTask>(`/leads/${leadId}/tasks`, input, {
        token,
        schema: crmTaskSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
    },
  });
}
