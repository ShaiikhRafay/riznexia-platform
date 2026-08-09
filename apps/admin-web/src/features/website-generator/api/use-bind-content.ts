'use client';

import { useAuth } from '@clerk/nextjs';
import { contentManifestSchema, type ContentManifest } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// `POST /leads/:id/content` — no request body, gated on `content:bind`.
// Requires a `ComponentManifest` to already exist
// (`ComponentManifestNotFoundException` otherwise).
export function useBindContent(leadId: string): UseMutationResult<ContentManifest, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<ContentManifest>(`/leads/${leadId}/content`, undefined, {
        token,
        schema: contentManifestSchema,
      });
    },
    onSuccess: (manifest) => {
      queryClient.setQueryData(['leads', leadId, 'content-manifest'], manifest);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'content-manifest'] });
    },
  });
}
