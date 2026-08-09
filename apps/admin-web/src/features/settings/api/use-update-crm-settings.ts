'use client';

import { useAuth } from '@clerk/nextjs';
import {
  crmSettingsSchema,
  type CrmSettings,
  type UpdateCrmSettingsInput,
} from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Company Settings (F13): `PATCH /crm/settings`, gated `crm:manage`. Same
// singleton, no id param — mirrors the backend controller's own shape.
export function useUpdateCrmSettings(): UseMutationResult<
  CrmSettings,
  unknown,
  UpdateCrmSettingsInput
> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCrmSettingsInput) => {
      const token = await getToken();
      return apiClient.patch<CrmSettings>('/crm/settings', input, {
        token,
        schema: crmSettingsSchema,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['crm-settings'], data);
    },
  });
}
