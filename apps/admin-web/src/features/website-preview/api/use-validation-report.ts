'use client';

import { useAuth } from '@clerk/nextjs';
import { previewReportSchema, type PreviewReport } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Validation Report (F9): `GET /leads/:id/preview/validation` — same
// GET-computes-and-caches, no-POST, no-polling shape as
// `useWebsitePreview`. Independent of the WebsitePreview resource — its
// own cache/version sequence, its own 404 if no GeneratedWebsite exists.
export function useValidationReport(leadId: string): UseQueryResult<PreviewReport> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'preview-report'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<PreviewReport>(`/leads/${leadId}/preview/validation`, {
        token,
        schema: previewReportSchema,
      });
    },
  });
}
