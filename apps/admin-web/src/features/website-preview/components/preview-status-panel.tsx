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
} from '@riznexia/ui';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { useGeneratedWebsite } from '@/src/features/website-generator/api/use-generated-website';
import { ApiError } from '@/src/lib/api-client';
import { useWebsitePreview } from '../api/use-website-preview';
import { FieldRow } from './detail-primitives';

export interface PreviewStatusPanelProps {
  leadId: string;
  businessName: string;
}

// Website Preview Dashboard (F9): "Display preview status", "Generate
// Preview (if backend requires)", "Display latest preview information".
// Reuses F8's `useGeneratedWebsite()` directly to check the real
// precondition (M9's own `GENERATED_WEBSITE_NOT_FOUND` 404 confirms every
// preview/validation/readiness GET requires a GeneratedWebsite to already
// exist) before ever calling the privileged `website:preview` endpoint.
// "Generate Preview" is resolved by omission — the backend has no POST for
// this resource at all; the GET itself computes-and-caches automatically,
// so there is nothing to trigger. See DECISIONS.md D-171.
export function PreviewStatusPanel({ leadId, businessName }: PreviewStatusPanelProps) {
  const { data: website, isLoading, error, refetch } = useGeneratedWebsite(leadId);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!website) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusBadge variant="neutral" label="Website Not Generated Yet" />
          <p className="text-(--color-text-secondary) text-sm">
            Website Preview needs a generated website first — run Website Generator for{' '}
            {businessName}.
          </p>
          <Button variant="secondary" size="sm" asChild className="self-start">
            <Link href={`/website-generator/${leadId}`}>Go to Website Generator</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <PermissionGate
      permission="website:preview"
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Preview Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-(--color-text-secondary) text-sm">
              You don&rsquo;t have permission to open the website preview.
            </p>
          </CardContent>
        </Card>
      }
    >
      <PreviewDetails leadId={leadId} />
    </PermissionGate>
  );
}

function PreviewDetails({ leadId }: { leadId: string }) {
  const { data: preview, isLoading, error, refetch } = useWebsitePreview(leadId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (error) {
    if (error instanceof ApiError && error.code === 'GENERATED_WEBSITE_NOT_FOUND') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Preview Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge variant="neutral" label="Website Not Generated Yet" />
          </CardContent>
        </Card>
      );
    }
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!preview) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview Status</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusBadge variant="success" label="Preview Available" />
        <p className="text-(--color-text-secondary) text-xs">
          Opening a preview page automatically generates or refreshes it against the current
          generated website — there is no separate action to trigger.
        </p>
        <FieldRow label="Business Name">{preview.businessName}</FieldRow>
        <FieldRow label="Theme Name">{preview.themeName}</FieldRow>
        <FieldRow label="Preview Version">{preview.previewVersion}</FieldRow>
        <FieldRow label="Generated Website Version">{preview.generatedWebsiteVersion}</FieldRow>
        <FieldRow label="Generator Version">{preview.generatedByModuleVersion}</FieldRow>
        <FieldRow label="File Count">{preview.files.length}</FieldRow>
        <FieldRow label="Created Date">{new Date(preview.createdAt).toLocaleString()}</FieldRow>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button size="sm" asChild>
            <Link href={`/website-preview/${leadId}/preview`}>Responsive Preview</Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/website-preview/${leadId}/validation`}>Validation Report</Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/website-preview/${leadId}/readiness`}>Publish Readiness</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
