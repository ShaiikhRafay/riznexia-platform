'use client';

import { useAuth } from '@clerk/nextjs';
import type { CreateDiscoveryJobInput, DiscoveryJob } from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// `POST /discovery-jobs` fans one request out into one job per category
// server-side (createJobs() in discovery.service.ts) and returns the
// created rows directly — no separate "import" step exists, so the
// mutation's own success is the only signal Discovery History needs to
// refresh.
export function useCreateDiscoveryJob(): UseMutationResult<
  DiscoveryJob[],
  unknown,
  CreateDiscoveryJobInput
> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDiscoveryJobInput) => {
      const token = await getToken();
      return apiClient.post<DiscoveryJob[]>('/discovery-jobs', input, { token });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['discovery-jobs'] });
    },
  });
}
