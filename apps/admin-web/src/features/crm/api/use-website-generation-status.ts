'use client';

import { useAuth } from '@clerk/nextjs';
import {
  websiteGenerationStatusSchema,
  type WebsiteGenerationStatus,
} from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Website Status (F10 Lead CRM Details): `GET /leads/:id/website-status`
// — gated on `leads:read`, not `crm:view` (deliberate backend choice,
// M10 Decision 8). Computed synchronously from 7 existence-checks against
// M6-M9's own tables, never persisted — a rollup of Riznexia's own
// generation pipeline, distinct from `Lead.websiteStatus` (whether the
// prospect already has a website of their own).
export function useWebsiteGenerationStatus(
  leadId: string,
): UseQueryResult<WebsiteGenerationStatus> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['leads', leadId, 'website-status'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<WebsiteGenerationStatus>(`/leads/${leadId}/website-status`, {
        token,
        schema: websiteGenerationStatusSchema,
      });
    },
  });
}
