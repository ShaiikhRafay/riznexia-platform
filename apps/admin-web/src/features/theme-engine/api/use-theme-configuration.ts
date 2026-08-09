'use client';

import { useAuth } from '@clerk/nextjs';
import { themeConfigurationSchema, type ThemeConfiguration } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Theme Selection Dashboard/Details (F7): `GET /leads/:id/theme` returns
// the single latest `ThemeConfiguration` for a lead, or `null` if none
// has ever been selected — verified directly against
// `findLatestForLead()`, the only read path (no history/versions
// endpoint exists in this module either).
//
// Deliberately no `refetchInterval` here — `ThemeConfiguration` has no
// status enum at all (verified against both the Prisma model and
// `themeConfigurationSchema`). Theme selection runs synchronously inside
// `POST /leads/:id/theme` (the AI recommendation step is `await`ed, with
// a try/catch fallback to rules-only scoring on failure/quota) and the
// endpoint always returns a fully-formed, terminal row — there is no
// intermediate state to poll for, unlike F3/F5/F6's async workflows. See
// DECISIONS.md for this module.
export function useThemeConfiguration(leadId: string): UseQueryResult<ThemeConfiguration | null> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'theme-configuration'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<ThemeConfiguration | null>(`/leads/${leadId}/theme`, {
        token,
        schema: themeConfigurationSchema.nullable(),
      });
    },
  });
}
