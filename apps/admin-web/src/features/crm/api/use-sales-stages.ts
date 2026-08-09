'use client';

import { useAuth } from '@clerk/nextjs';
import { salesStageSchema, type SalesStage } from '@riznexia/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';
import { z } from 'zod';

// Pipeline Board / stage pickers (F10): `GET /crm/stages` — a
// configurable DB-backed list (order/name/color/isWon/isLost, seeded with
// 10 rows but editable via `/crm/stages` CRUD), never a fixed frontend
// enum. Every stage-driven UI in this feature fetches this instead of
// hardcoding stage keys.
export function useSalesStages(): UseQueryResult<SalesStage[]> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['crm-stages'],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<SalesStage[]>('/crm/stages', {
        token,
        schema: z.array(salesStageSchema),
      });
    },
  });
}
