'use client';

import { Button, ErrorState, Skeleton, toast } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { useBusinessAnalysis } from '@/src/features/business-analysis/api/use-business-analysis';
import { useThemeConfiguration } from '@/src/features/theme-engine/api/use-theme-configuration';
import { ApiError } from '@/src/lib/api-client';
import { useAssembleWebsite } from '../api/use-assemble-website';
import { useGeneratedWebsite } from '../api/use-generated-website';
import { DetailCard, FieldRow } from './detail-primitives';

export interface GeneratedWebsiteOverviewProps {
  leadId: string;
}

// Generated Website Overview (F8): Website Version, Generator Version,
// Created Date, Generated Files Summary, Theme Used, Business Analysis
// Version, Theme Configuration Version — "only display fields returned
// by the backend, never invent data." `GeneratedWebsite`'s own response
// carries only raw foreign-key ids (no denormalized theme name or
// analysis version) — verified against `toGeneratedWebsiteResponse()`
// directly — so "Theme Used"/"Theme Configuration Version"/"Business
// Analysis Version" are resolved via F6's/F7's own already-reviewed GET
// hooks, reused directly rather than re-implemented (the same
// cross-feature hook-layer reuse F7 itself established, D-158). "Generated
// Files Summary" is pure client-side display math over the real `files`
// array (count + paths) — not regeneration, since nothing is computed
// beyond `.length`/`.map(f => f.path)` on data the backend already
// returned in full.
export function GeneratedWebsiteOverview({ leadId }: GeneratedWebsiteOverviewProps) {
  const { data: website, isLoading, error, refetch } = useGeneratedWebsite(leadId);
  const { data: theme } = useThemeConfiguration(leadId);
  const { data: businessAnalysis } = useBusinessAnalysis(leadId);
  const assembleWebsite = useAssembleWebsite(leadId);

  async function handleGenerate() {
    try {
      await assembleWebsite.mutateAsync();
      toast.success('Website generated');
    } catch (assembleError) {
      const message =
        assembleError instanceof ApiError
          ? assembleError.message
          : 'Could not generate the website.';
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/website-generator">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Website Generator
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !website ? (
        <div className="flex flex-col gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">Generated Website</h1>
          <p className="text-(--color-text-secondary) text-sm">
            No website has been generated for this lead yet.
          </p>
          <PermissionGate permission="website:assemble">
            <Button
              onClick={() => void handleGenerate()}
              loading={assembleWebsite.isPending}
              className="self-start"
            >
              Generate Website
            </Button>
          </PermissionGate>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-h1 text-(--color-text-primary) font-semibold">Generated Website</h1>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/website-generator/${leadId}/layout`}>Layout</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/website-generator/${leadId}/components`}>Components</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/website-generator/${leadId}/content`}>Content</Link>
              </Button>
              <PermissionGate permission="website:assemble">
                <Button
                  size="sm"
                  onClick={() => void handleGenerate()}
                  loading={assembleWebsite.isPending}
                >
                  Re-generate Website
                </Button>
              </PermissionGate>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard title="Website Metadata">
              <FieldRow label="Website Version">{website.configVersion}</FieldRow>
              <FieldRow label="Generator Version">{website.assemblyEngineVersion}</FieldRow>
              <FieldRow label="Created Date">
                {new Date(website.createdAt).toLocaleString()}
              </FieldRow>
            </DetailCard>

            <DetailCard title="Generated Files Summary">
              <FieldRow label="File Count">{website.files.length}</FieldRow>
              {website.files.length > 0 ? (
                <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm">
                  {website.files.map((file) => (
                    <li key={file.path} className="text-(--color-text-primary) font-mono text-xs">
                      {file.path}
                    </li>
                  ))}
                </ul>
              ) : null}
            </DetailCard>

            <DetailCard title="Built From">
              <FieldRow label="Theme Used">{theme?.themeName ?? '—'}</FieldRow>
              <FieldRow label="Theme Configuration Version">{theme?.configVersion ?? '—'}</FieldRow>
              <FieldRow label="Business Analysis Version">
                {businessAnalysis?.analysisVersion ?? '—'}
              </FieldRow>
            </DetailCard>
          </div>
        </>
      )}
    </div>
  );
}
