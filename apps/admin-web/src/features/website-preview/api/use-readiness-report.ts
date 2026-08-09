'use client';

import { useAuth } from '@clerk/nextjs';
import { publishReadinessReportSchema, type PublishReadinessReport } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Publish Readiness (F9): `GET /leads/:id/preview/readiness` — same
// GET-computes-and-caches, no-POST, no-polling shape as
// `useWebsitePreview`/`useValidationReport`. The backend never reads a
// persisted PreviewReport row to build this — it independently re-runs
// every validator and aggregates fresh, so this works even if
// `/preview/validation` has never been called for this lead.
export function useReadinessReport(leadId: string): UseQueryResult<PublishReadinessReport> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'publish-readiness'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<PublishReadinessReport>(`/leads/${leadId}/preview/readiness`, {
        token,
        schema: publishReadinessReportSchema,
      });
    },
  });
}
