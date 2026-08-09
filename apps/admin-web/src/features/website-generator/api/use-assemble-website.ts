'use client';

import { useAuth } from '@clerk/nextjs';
import { generatedWebsiteSchema, type GeneratedWebsite } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// `POST /leads/:id/website` — "Generate Website" — no request body,
// gated on `website:assemble`. Requires a `ContentManifest` to already
// exist (`ContentManifestNotFoundException` otherwise) — the final link
// in the Layout→Component→Content→Website chain, none of which the
// backend auto-triggers on the caller's behalf (verified directly against
// `website-assembly.service.ts` — no cross-module orchestration exists
// anywhere in this backend). This is why the Dashboard drives all four
// stages individually rather than exposing one "Generate Website" button
// scoped to only this permission (see DECISIONS.md for this module).
export function useAssembleWebsite(
  leadId: string,
): UseMutationResult<GeneratedWebsite, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<GeneratedWebsite>(`/leads/${leadId}/website`, undefined, {
        token,
        schema: generatedWebsiteSchema,
      });
    },
    onSuccess: (website) => {
      queryClient.setQueryData(['leads', leadId, 'generated-website'], website);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'generated-website'] });
    },
  });
}
