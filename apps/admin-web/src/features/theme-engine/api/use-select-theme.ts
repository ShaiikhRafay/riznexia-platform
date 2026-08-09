'use client';

import { useAuth } from '@clerk/nextjs';
import { themeConfigurationSchema, type ThemeConfiguration } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Run/Re-run Theme Selection (F7): `POST /leads/:id/theme` takes no
// request body (verified against the controller — no `@Body()`
// parameter). The backend never rejects a re-run: it returns the
// existing configuration unchanged (cache hit — HTTP 200 — when a
// `ThemeConfiguration` already exists for the lead's *latest completed*
// `BusinessAnalysis`) or creates a new, version-incremented row (cache
// miss — HTTP 201 — when business analysis has been re-run since the
// last theme selection, or none has ever run). There is no per-request
// fingerprint the way M6 has; the cache key is simply "does a
// ThemeConfiguration already exist for this exact businessAnalysisId."
// One mutation serves both "Run" and "Re-run" — only the calling
// button's label differs (see DECISIONS.md for this module).
export function useSelectTheme(
  leadId: string,
): UseMutationResult<ThemeConfiguration, unknown, void> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient.post<ThemeConfiguration>(`/leads/${leadId}/theme`, undefined, {
        token,
        schema: themeConfigurationSchema,
      });
    },
    onSuccess: (config) => {
      queryClient.setQueryData(['leads', leadId, 'theme-configuration'], config);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'theme-configuration'] });
    },
  });
}
