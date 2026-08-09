'use client';

import { useAuth } from '@clerk/nextjs';
import {
  websiteDeploymentSchema,
  type CreateWebsiteDeploymentInput,
  type WebsiteDeployment,
} from '@riznexia/shared-types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api-client';

// Deployment Dashboard (F11): `POST /leads/:id/deployments` — "Deploy",
// gated `deployment:create`. The backend itself enforces every real
// precondition (a GeneratedWebsite must exist, Publish Readiness must have
// passed) and returns a real error otherwise
// (`GENERATED_WEBSITE_NOT_FOUND`/`DEPLOYMENT_VALIDATION_FAILED`) — this
// hook never pre-validates either on the frontend, matching "never
// simulate deployments, never implement deployment logic locally."
export function useCreateDeployment(
  leadId: string,
): UseMutationResult<WebsiteDeployment, unknown, CreateWebsiteDeploymentInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWebsiteDeploymentInput) => {
      const token = await getToken();
      return apiClient.post<WebsiteDeployment>(`/leads/${leadId}/deployments`, input, {
        token,
        schema: websiteDeploymentSchema,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'deployment-status'] });
      void queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'deployments'] });
    },
  });
}
