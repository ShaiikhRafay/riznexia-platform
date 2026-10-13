'use client';

import { useAuth } from '@clerk/nextjs';
import type { SalesProposal } from '@riznexia/shared-types';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { ApiError, apiClient } from '@/src/lib/api-client';
import { env } from '@/src/lib/env';

export interface OutreachView {
  leadId: string;
  business: {
    name: string;
    category: string;
    city: string;
    address: string;
    phone: string | null;
    rating: number | null;
    reviewCount: number | null;
    googleBusinessUrl: string | null;
    telLink: string | null;
    whatsappLink: string | null;
    mapsLink: string;
  };
  liveUrl: string | null;
  deploymentStatus: string | null;
  shareLinks: { whatsapp: string | null; mailto: string | null };
}

export interface CustomSiteDeploymentView {
  id: string;
  customSiteId: string;
  status: 'in_progress' | 'completed' | 'failed';
  liveUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CustomSiteView {
  id: string;
  version: number;
  fileCount: number;
  totalBytes: number;
  warnings: string[];
  createdAt: string;
  deployments: CustomSiteDeploymentView[];
}

export interface ProposalDraft {
  title: string;
  content: string;
  whatsappLink: string | null;
}

export type DraftLanguage = 'en' | 'roman_ur';
export type DraftChannel = 'whatsapp' | 'email';

export function useOutreach(leadId: string): UseQueryResult<OutreachView> {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['leads', leadId, 'outreach'],
    queryFn: async () =>
      apiClient.get<OutreachView>(`/leads/${leadId}/outreach`, { token: await getToken() }),
  });
}

export function useCustomSites(leadId: string): UseQueryResult<CustomSiteView[]> {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['leads', leadId, 'custom-sites'],
    queryFn: async () =>
      apiClient.get<CustomSiteView[]>(`/leads/${leadId}/custom-sites`, {
        token: await getToken(),
      }),
    // Vercel builds take 1-3 minutes: poll while anything is still building.
    refetchInterval: (query) =>
      query.state.data?.some((s) => s.deployments.some((d) => d.status === 'in_progress'))
        ? 5000
        : false,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, leadId: string) {
  void qc.invalidateQueries({ queryKey: ['leads', leadId, 'custom-sites'] });
  void qc.invalidateQueries({ queryKey: ['leads', leadId, 'outreach'] });
}

// Raw zip body — apiClient only speaks JSON, so this calls fetch directly
// and maps the backend's error envelope to the same ApiError.
export function useUploadSite(leadId: string): UseMutationResult<CustomSiteView, unknown, File> {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      let res: Response;
      try {
        res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/leads/${leadId}/custom-sites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/zip', Authorization: `Bearer ${token ?? ''}` },
          body: file,
        });
      } catch {
        throw new ApiError({
          code: 'NETWORK_ERROR',
          message: 'Could not reach the server.',
          status: 0,
        });
      }
      const payload = (await res.json().catch(() => null)) as
        | (CustomSiteView & { error?: undefined })
        | { error: { code: string; message: string; details?: { errors?: string[] } } }
        | null;
      if (!res.ok || !payload || 'error' in payload) {
        const err = payload && 'error' in payload ? payload.error : null;
        throw new ApiError({
          code: err?.code ?? 'UNKNOWN_ERROR',
          message: err?.details?.errors?.join('\n') ?? err?.message ?? 'Upload failed',
          status: res.status,
          details: err?.details,
        });
      }
      return payload as CustomSiteView;
    },
    onSuccess: () => invalidateAll(qc, leadId),
  });
}

export function useDeploySite(
  leadId: string,
): UseMutationResult<CustomSiteDeploymentView, unknown, string> {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (siteId: string) =>
      apiClient.post<CustomSiteDeploymentView>(
        `/leads/${leadId}/custom-sites/${siteId}/deployments`,
        {},
        { token: await getToken() },
      ),
    onSuccess: () => invalidateAll(qc, leadId),
  });
}

export function useProposalDraft(
  leadId: string,
): UseMutationResult<
  ProposalDraft,
  unknown,
  { language: DraftLanguage; channel: DraftChannel; offer?: string; senderName?: string }
> {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async (input) =>
      apiClient.post<ProposalDraft>(`/leads/${leadId}/proposal-draft`, input, {
        token: await getToken(),
      }),
  });
}

export function useSaveProposal(leadId: string): UseMutationResult<SalesProposal, unknown, string> {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      apiClient.post<SalesProposal>(
        `/leads/${leadId}/proposals`,
        { content },
        { token: await getToken() },
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leads', leadId, 'proposals'] }),
  });
}

export function useMarkProposalSent(
  leadId: string,
): UseMutationResult<SalesProposal, unknown, string> {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string) =>
      apiClient.patch<SalesProposal>(
        `/leads/${leadId}/proposals/${proposalId}`,
        { status: 'sent_manually' },
        { token: await getToken() },
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leads', leadId, 'proposals'] }),
  });
}

// Build Pack is a binary download behind Bearer auth, so it is fetched and
// handed to the browser as a Blob rather than linked.
export function useBuildPackDownload(leadId: string, fileLabel: string) {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/leads/${leadId}/build-pack`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { code: string; message: string };
        } | null;
        throw new ApiError({
          code: body?.error?.code ?? 'UNKNOWN_ERROR',
          message:
            body?.error?.code === 'THEME_CONFIGURATION_NOT_FOUND'
              ? 'Run Business Analysis and Theme Engine for this lead first.'
              : (body?.error?.message ?? 'Could not build the pack'),
          status: res.status,
        });
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `build-pack-${fileLabel}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}
