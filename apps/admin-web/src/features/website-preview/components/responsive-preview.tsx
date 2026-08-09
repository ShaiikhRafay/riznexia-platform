'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Skeleton,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@riznexia/ui';
import type {
  DevicePreviewMode,
  DevicePreviewPreset,
  PreviewFileEntry,
} from '@riznexia/shared-types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useWebsitePreview } from '../api/use-website-preview';

export interface ResponsivePreviewProps {
  leadId: string;
}

const DEFAULT_MODE: DevicePreviewMode = 'desktop';

// Responsive Preview (F9 Pages: Desktop/Tablet/Mobile Preview). The
// founder's own instruction — "Switching between modes must only change
// the viewport. Never regenerate the website." — describes one mounted
// view with a mode switcher, not three independently-fetched pages; the
// three "pages" the brief lists are delivered as one route with a shared
// `Tabs` strip (`?device=` URL-persisted, so each mode is still directly
// linkable/bookmarkable). One `useWebsitePreview()` call backs every mode
// — switching tabs re-renders the same already-fetched data at a different
// CSS width, never a new fetch.
//
// What's actually rendered inside each device frame is a structural file
// manifest, not live rendered pixels of the site: `WebsitePreview.files`
// is `{path, sizeBytes}[]` (no HTML/screenshot), and `GeneratedWebsite`'s
// own `files` carry raw Next.js/React source text, not rendered output.
// Executing/transpiling that source client-side to produce real pixels
// would itself be "regenerating the website in the browser" — exactly
// what the brief's own "do not regenerate websites on the frontend" rule
// forbids. With both the literal ask (real rendered pixels) and the only
// technical path to it (client-side execution) foreclosed by the brief's
// own rules, the one compliant option is an honest, clearly-labeled
// structural summary sized to the selected viewport — never presented as
// a live render. See DECISIONS.md D-172.
export function ResponsivePreview({ leadId }: ResponsivePreviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Internal state (not the URL) is the source of truth for which tab is
  // active — Next's `useSearchParams()` only reflects a URL change after a
  // full navigation round trip, which would make switching feel laggy for
  // something the brief explicitly says "must only change the viewport."
  // The URL is still kept in sync via `router.replace` below, purely so a
  // given mode stays directly linkable/bookmarkable.
  const [mode, setMode] = useState<DevicePreviewMode>(
    () => (searchParams.get('device') as DevicePreviewMode | null) ?? DEFAULT_MODE,
  );

  function selectMode(next: string) {
    setMode(next as DevicePreviewMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set('device', next);
    router.replace(`?${params.toString()}`);
  }

  const { data: preview, isLoading, error, refetch } = useWebsitePreview(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/website-preview?leadId=${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Website Preview
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Responsive Preview</h1>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : error ? (
        error instanceof ApiError && error.code === 'GENERATED_WEBSITE_NOT_FOUND' ? (
          <p className="text-(--color-text-secondary) text-sm">
            No generated website exists yet for this lead — run Website Generator first.
          </p>
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )
      ) : preview ? (
        <PermissionGate
          permission="website:preview"
          fallback={
            <p className="text-(--color-text-secondary) text-sm">
              You don&rsquo;t have permission to open the website preview.
            </p>
          }
        >
          <Tabs value={mode} onValueChange={selectMode}>
            <TabsList>
              <TabsTrigger value="desktop">Desktop</TabsTrigger>
              <TabsTrigger value="tablet">Tablet</TabsTrigger>
              <TabsTrigger value="mobile">Mobile</TabsTrigger>
            </TabsList>
            {preview.devicePresets.map((preset) => (
              <TabsContent key={preset.mode} value={preset.mode}>
                <DeviceFrame
                  preset={preset}
                  businessName={preview.businessName}
                  themeName={preview.themeName}
                  files={preview.files}
                />
              </TabsContent>
            ))}
          </Tabs>
        </PermissionGate>
      ) : null}
    </div>
  );
}

function DeviceFrame({
  preset,
  businessName,
  themeName,
  files,
}: {
  preset: DevicePreviewPreset;
  businessName: string;
  themeName: string;
  files: readonly PreviewFileEntry[];
}) {
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div
      className="mx-auto flex flex-col gap-3"
      style={{ maxWidth: preset.widthPx, width: '100%' }}
    >
      <div className="flex items-center justify-between">
        <StatusBadge variant="info" label={`${preset.widthPx}px viewport`} />
        <p className="text-(--color-text-secondary) text-xs">
          Structural summary, not a rendered screenshot — the backend returns a file manifest, not
          HTML.
        </p>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="border-(--color-border-default) bg-(--color-bg-surface-raised) flex items-center gap-1.5 border-b px-3 py-2">
          <span className="bg-(--color-danger)/60 h-2.5 w-2.5 rounded-full" aria-hidden="true" />
          <span className="bg-(--color-warning)/60 h-2.5 w-2.5 rounded-full" aria-hidden="true" />
          <span className="bg-(--color-success)/60 h-2.5 w-2.5 rounded-full" aria-hidden="true" />
        </div>
        <CardHeader className="p-4 pb-0">
          <CardTitle>{businessName}</CardTitle>
          <p className="text-(--color-text-secondary) text-xs">Theme: {themeName}</p>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-(--color-text-secondary) text-xs font-medium">
            Generated files ({sortedFiles.length})
          </p>
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-xs">
            {sortedFiles.map((file) => (
              <li key={file.path} className="flex items-center justify-between gap-2 font-mono">
                <span className="text-(--color-text-primary) truncate">{file.path}</span>
                <span className="text-(--color-text-secondary) shrink-0">
                  {formatBytes(file.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  return `${(sizeBytes / 1024).toFixed(1)} KB`;
}
