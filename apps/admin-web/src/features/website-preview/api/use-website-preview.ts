'use client';

import { useAuth } from '@clerk/nextjs';
import { websitePreviewSchema, type WebsitePreview } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Website Preview Dashboard / Responsive Preview (F9): `GET
// /leads/:id/preview` — unlike every prior GET hook in this app, this one
// is never `.nullable()`. The backend has no POST for this resource at
// all; the GET itself synchronously computes-and-caches the artifact
// (keyed to GeneratedWebsite.configVersion) and returns it every time, or
// throws `GENERATED_WEBSITE_NOT_FOUND` (404) if no GeneratedWebsite exists
// yet for this lead — the query client's own default retry policy already
// never retries a 4xx, so that 404 surfaces immediately as `error`. No
// polling — nothing here is ever pending.
export function useWebsitePreview(leadId: string): UseQueryResult<WebsitePreview> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'website-preview'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<WebsitePreview>(`/leads/${leadId}/preview`, {
        token,
        schema: websitePreviewSchema,
      });
    },
  });
}
