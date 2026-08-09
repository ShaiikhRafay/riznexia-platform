'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// `DELETE /leads/:id` — a soft delete server-side (`leads:delete`); the
// response is `204 No Content`, so this mutation resolves to `undefined`.
export function useDeleteLead(): UseMutationResult<void, unknown, string> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const token = await getToken();
      await apiClient.delete<void>(`/leads/${leadId}`, { token });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
