'use client';

import { useAuth } from '@clerk/nextjs';
import { lostReasonSchema, type LostReason } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { z } from 'zod';

// Lost-reason picker (F10): `GET /crm/lost-reasons` — required whenever a
// lead is moved into a stage with `isLost: true` (`POST
// /leads/:id/crm/stage` throws `LostReasonRequiredException` otherwise).
export function useLostReasons(): UseQueryResult<LostReason[]> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['crm-lost-reasons'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<LostReason[]>('/crm/lost-reasons', {
        token,
        schema: z.array(lostReasonSchema),
      });
    },
  });
}
