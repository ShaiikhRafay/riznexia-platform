'use client';

import { useAuth } from '@clerk/nextjs';
import { crmSettingsSchema, type CrmSettings } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Company Settings (F13): `GET /crm/settings` — the M10 singleton row
// (currency/timezone/businessHours/defaultReminderMinutesBeforeDue), gated
// `crm:view`. This is the only real "company-level" configuration surface
// the backend exposes — reused here rather than duplicated (D-196).
export function useCrmSettings(): UseQueryResult<CrmSettings> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['crm-settings'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<CrmSettings>('/crm/settings', { token, schema: crmSettingsSchema });
    },
  });
}
