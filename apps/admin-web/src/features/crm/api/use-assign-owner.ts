'use client';

import { useAuth } from '@clerk/nextjs';
import { leadCrmSchema, type AssignLeadOwnerInput, type LeadCRM } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Assign Owner (F10 Pipeline Board + Lead CRM Details): `POST
// /leads/:id/crm/owner` — gated on `crm:assign`, split out from
// `crm:manage` since reassignment is commonly manager-only (a
// `sales_executive` holds `crm:manage` but not `crm:assign`).
export function useAssignOwner(
  leadId: string,
): UseMutationResult<LeadCRM, unknown, AssignLeadOwnerInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignLeadOwnerInput) => {
      const token = await getToken();
      return apiClient.post<LeadCRM>(`/leads/${leadId}/crm/owner`, input, {
        token,
        schema: leadCrmSchema,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['leads', leadId, 'crm'], data);
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'activity'] });
    },
  });
}
