'use client';

import { useAuth } from '@clerk/nextjs';
import { layoutConfigurationSchema, type LayoutConfiguration } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// `POST /leads/:id/layout` — no request body, gated on `layout:generate`.
// Requires a `ThemeConfiguration` to already exist for the lead
// (`ThemeConfigurationNotFoundException` otherwise) — same hard
// upstream-dependency shape as every M8.x generation step. Same
// cache-hit(200, unchanged fingerprint)/cache-miss(201, new version)
// semantics as F6/F7's trigger mutations.
export function useGenerateLayout(
  leadId: string,
): UseMutationResult<LayoutConfiguration, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<LayoutConfiguration>(`/leads/${leadId}/layout`, undefined, {
        token,
        schema: layoutConfigurationSchema,
      });
    },
    onSuccess: (config) => {
      queryClient.setQueryData(['leads', leadId, 'layout-configuration'], config);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'layout-configuration'] });
    },
  });
}
