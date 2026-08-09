'use client';

import { useAuth } from '@clerk/nextjs';
import type { LeadCRM } from '@riznexia/shared-types';
import { useQueries } from '@tanstack/react-query';
import { fetchLeadCrm, leadCrmQueryKey } from './use-lead-crm';

// Pipeline Board (F10): the bounded N+1 half of the founder-approved
// resolution (DECISIONS.md D-177) — one real `GET /leads/:id/crm` per
// currently-loaded lead, batched via `useQueries` rather than N separate
// `useLeadCrm()` hook calls (hooks can't be called in a loop). Shares the
// exact same query key (`leadCrmQueryKey`) `useLeadCrm` uses, so a lead
// already fetched elsewhere (e.g. its own Lead CRM Details page) is
// served from cache here instead of re-fetched, and vice versa.
export function useBoardLeadsCrm(leadIds: readonly string[]): Record<string, LeadCRM | undefined> {
  const { getToken } = useAuth();

  const results = useQueries({
    queries: leadIds.map((leadId) => ({
      queryKey: leadCrmQueryKey(leadId),
      queryFn: async () => {
        const token = await getToken();
        return fetchLeadCrm(leadId, token);
      },
    })),
  });

  const byLeadId: Record<string, LeadCRM | undefined> = {};
  leadIds.forEach((leadId, index) => {
    byLeadId[leadId] = results[index]?.data;
  });
  return byLeadId;
}
