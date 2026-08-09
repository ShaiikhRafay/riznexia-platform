'use client';

import { useAuth } from '@clerk/nextjs';
import { leadCrmSchema, type LeadCRM } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Shared query-key builder — used by both `useLeadCrm` (single lead) and
// the Pipeline Board's `useQueries`-based batch fetch (`use-board-leads.ts`)
// so the two share one cache entry per lead instead of double-fetching.
export function leadCrmQueryKey(leadId: string): readonly unknown[] {
  return ['leads', leadId, 'crm'];
}

export async function fetchLeadCrm(leadId: string, token: string | null): Promise<LeadCRM> {
  return apiClient.get<LeadCRM>(`/leads/${leadId}/crm`, { token, schema: leadCrmSchema });
}

// CRM Status (F10): `GET /leads/:id/crm` — lazy get-or-create on the
// backend (creates a `LeadCRM` row on first touch, defaulting to
// `CrmSettings.defaultStageId`), so this always resolves to a full
// `LeadCRM`, never `null` — unlike M6-M9's own GET hooks.
export function useLeadCrm(leadId: string): UseQueryResult<LeadCRM> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: leadCrmQueryKey(leadId),
    queryFn: async () => {
      const token = await getToken();
      return fetchLeadCrm(leadId, token);
    },
  });
}
