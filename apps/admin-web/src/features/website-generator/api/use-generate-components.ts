'use client';

import { useAuth } from '@clerk/nextjs';
import { componentManifestSchema, type ComponentManifest } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// `POST /leads/:id/components` — no request body, gated on
// `component:generate`. Requires a `LayoutConfiguration` to already exist
// (`LayoutConfigurationNotFoundException` otherwise).
export function useGenerateComponents(
  leadId: string,
): UseMutationResult<ComponentManifest, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<ComponentManifest>(`/leads/${leadId}/components`, undefined, {
        token,
        schema: componentManifestSchema,
      });
    },
    onSuccess: (manifest) => {
      queryClient.setQueryData(['leads', leadId, 'component-manifest'], manifest);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'component-manifest'] });
    },
  });
}
