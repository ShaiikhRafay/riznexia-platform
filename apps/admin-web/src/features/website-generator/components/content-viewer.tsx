'use client';

import type { ContentValue } from '@riznexia/shared-types';
import { Button, DataTable, ErrorState, Skeleton, type ColumnDef } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useContentManifest } from '../api/use-content-manifest';
import { DetailCard, FieldRow, ListField } from './detail-primitives';

export interface ContentViewerProps {
  leadId: string;
}

interface BoundContentRow {
  key: string;
  componentId: string;
  slotName: string;
  kind: string;
  summary: string;
  source: string;
  photoReference: string | null;
}

// `ContentValue` is a five-variant union (text/text-list/link/link-list/
// image-ref) — this renders a plain human-readable summary of whichever
// variant is actually present, never resolving/fetching anything.
function describeContentValue(value: ContentValue): {
  summary: string;
  photoReference: string | null;
} {
  const inner: unknown = value.value;

  if (typeof inner === 'string') {
    return { summary: inner, photoReference: null };
  }

  if (Array.isArray(inner)) {
    if (inner.length > 0 && typeof inner[0] === 'string') {
      return { summary: (inner as string[]).join(', '), photoReference: null };
    }
    const links = inner as { label: string; targetComponentId: string }[];
    return {
      summary: links.map((link) => `${link.label} → ${link.targetComponentId}`).join(', '),
      photoReference: null,
    };
  }

  if (inner !== null && typeof inner === 'object' && 'photoReference' in inner) {
    const photoReference = (inner as { photoReference: string }).photoReference;
    return { summary: `Image reference: ${photoReference}`, photoReference };
  }

  const link = inner as { label?: string; targetComponentId?: string; url?: string };
  const target = link.url ?? link.targetComponentId ?? null;
  const summary =
    link.label && target ? `${link.label} → ${target}` : (target ?? link.label ?? '—');
  return { summary, photoReference: null };
}

// Text Content and CTA Content (F8): the backend does not separately flag
// which bindings are "CTA" vs plain text — both live together in
// `componentContent` as `ContentFieldBinding` entries distinguished only
// by `kind`/`slotName`. Splitting them by guessing from naming would
// invent a classification the backend doesn't make, so this table shows
// every bound field together, honestly labeled "Bound Content" — the
// `source` column (present on every single value, per the backend's own
// "traceable to origin" requirement) satisfies "Source Information".
const COLUMNS: ColumnDef<BoundContentRow, unknown>[] = [
  { accessorKey: 'componentId', header: 'Component' },
  { accessorKey: 'slotName', header: 'Slot' },
  { accessorKey: 'kind', header: 'Kind' },
  { accessorKey: 'summary', header: 'Value' },
  { accessorKey: 'source', header: 'Source' },
];

export function ContentViewer({ leadId }: ContentViewerProps) {
  const { data: manifest, isLoading, error, refetch } = useContentManifest(leadId);

  const rows: BoundContentRow[] =
    manifest?.componentContent.flatMap((binding) =>
      binding.fields.map((field) => {
        const { summary, photoReference } = describeContentValue(field.value);
        return {
          key: `${binding.componentId}-${field.slotName}`,
          componentId: binding.componentId,
          slotName: field.slotName,
          kind: field.kind,
          summary,
          source: field.value.source,
          photoReference,
        };
      }),
    ) ?? [];
  const imageRows = rows.filter((row) => row.photoReference !== null);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/website-generator/${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Website Overview
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Content</h1>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !manifest ? (
        <p className="text-(--color-text-secondary) text-sm">
          No content has been bound for this lead yet.
        </p>
      ) : (
        <>
          <DetailCard title="Content Metadata">
            <FieldRow label="Content Engine Version">{manifest.contentEngineVersion}</FieldRow>
            <FieldRow label="Configuration Version">{manifest.configVersion}</FieldRow>
            <FieldRow label="Created">{new Date(manifest.createdAt).toLocaleString()}</FieldRow>
          </DetailCard>

          <section className="flex flex-col gap-3">
            <h2 className="text-h2 text-(--color-text-primary) font-semibold">Bound Content</h2>
            <DataTable
              columns={COLUMNS}
              data={rows}
              getRowId={(row) => row.key}
              emptyTitle="No bound content"
              sorting={{ mode: 'client' }}
              enableGlobalFilter
              globalFilterPlaceholder="Search bound content…"
            />
          </section>

          {imageRows.length > 0 ? (
            <DetailCard title="Image References">
              <p className="text-(--color-text-secondary) text-xs">
                Opaque provider photo tokens only — never fetched or rendered image bytes.
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {imageRows.map((row) => (
                  <li key={row.key} className="flex items-center justify-between">
                    <span className="text-(--color-text-primary) font-mono text-xs">
                      {row.photoReference}
                    </span>
                    <span className="text-(--color-text-secondary)">{row.source}</span>
                  </li>
                ))}
              </ul>
            </DetailCard>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard title="SEO Content">
              <FieldRow label="Meta Title">{manifest.seoMetadata.metaTitle?.value ?? '—'}</FieldRow>
              <FieldRow label="Meta Description">
                {manifest.seoMetadata.metaDescription?.value ?? '—'}
              </FieldRow>
              <ListField label="Keywords" items={manifest.seoMetadata.keywords.value} />
              <ListField
                label="Local SEO Suggestions"
                items={manifest.seoMetadata.localSeoSuggestions.value}
              />
            </DetailCard>

            <DetailCard title="Structured Data">
              {manifest.structuredData.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {manifest.structuredData.map((entry) => (
                    <li key={entry.type} className="text-(--color-text-primary)">
                      {entry.type} ({Object.keys(entry.data).length} field
                      {Object.keys(entry.data).length === 1 ? '' : 's'})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-(--color-text-secondary) text-sm">No structured data.</p>
              )}
            </DetailCard>
          </div>

          {manifest.unresolvedBindings.length > 0 ? (
            <DetailCard title="Unresolved Bindings">
              <p className="text-(--color-text-secondary) text-xs">
                Required content slots with no upstream source available — recorded explicitly,
                never fabricated.
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {manifest.unresolvedBindings.map((binding) => (
                  <li
                    key={`${binding.componentId}-${binding.slotName}`}
                    className="flex items-center justify-between"
                  >
                    <span className="text-(--color-text-primary)">
                      {binding.componentId} &middot; {binding.slotName}
                    </span>
                    <span className="text-(--color-text-secondary)">{binding.reason}</span>
                  </li>
                ))}
              </ul>
            </DetailCard>
          ) : null}
        </>
      )}
    </div>
  );
}
