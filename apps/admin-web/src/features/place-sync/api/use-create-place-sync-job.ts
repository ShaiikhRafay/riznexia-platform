'use client';

import { useAuth } from '@clerk/nextjs';
import {
  placeSyncJobSchema,
  type CreatePlaceSyncJobInput,
  type PlaceSyncJob,
} from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// `POST /place-sync-jobs` — exactly `createPlaceSyncJobSchema`'s shape,
// returning a single `PlaceSyncJob` (unlike `POST /discovery-jobs`, which
// fans out into an array). `provider` is not part of the input — the
// backend hardcodes it to Google server-side, so this frontend doesn't
// offer a provider picker for a choice the API doesn't accept.
export function useCreatePlaceSyncJob(): UseMutationResult<
  PlaceSyncJob,
  unknown,
  CreatePlaceSyncJobInput
> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePlaceSyncJobInput) => {
      const token = await getToken();
      return apiClient.post<PlaceSyncJob>('/place-sync-jobs', input, {
        token,
        schema: placeSyncJobSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['place-sync-jobs'] });
    },
  });
}
