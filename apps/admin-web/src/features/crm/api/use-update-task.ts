'use client';

import { useAuth } from '@clerk/nextjs';
import { crmTaskSchema, type CrmTask, type UpdateCrmTaskInput } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Tasks — Edit / Complete / Cancel (F10): all three are the same `PATCH
// /crm/tasks/:id` — the backend has no separate `/complete`/`/cancel`
// route. Setting `{status: 'completed'}` stamps `completedAt`/
// `completedById` server-side (idempotent); any other status clears both.
// `leadId` is accepted only for targeted cache invalidation when the
// caller already knows it (e.g. editing from Lead CRM Details) — the
// mutation itself never needs it, since the URL only takes `taskId`.
export function useUpdateTask(
  taskId: string,
  leadId?: string,
): UseMutationResult<CrmTask, unknown, UpdateCrmTaskInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCrmTaskInput) => {
      const token = await getToken();
      return apiClient.patch<CrmTask>(`/crm/tasks/${taskId}`, input, {
        token,
        schema: crmTaskSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      if (leadId) {
        void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'tasks'] });
      }
    },
  });
}
