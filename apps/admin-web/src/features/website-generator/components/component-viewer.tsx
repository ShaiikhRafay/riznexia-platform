'use client';

import type { ComponentDefinition } from '@riznexia/shared-types';
import { Button, DataTable, ErrorState, Skeleton, type ColumnDef } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useComponentManifest } from '../api/use-component-manifest';
import { DetailCard, FieldRow, ListField } from './detail-primitives';

export interface ComponentViewerProps {
  leadId: string;
}

// Component Name (F8 requirement) is `componentId` — `ComponentDefinition`
// has no separate `name` field (verified against `componentDefinitionSchema`
// directly); the id IS the component's identifying label.
const COLUMNS: ColumnDef<ComponentDefinition, unknown>[] = [
  { accessorKey: 'componentId', header: 'Component Name' },
  { accessorKey: 'componentType', header: 'Type' },
  { id: 'parent', header: 'Parent', cell: ({ row }) => row.original.parentComponentId ?? '—' },
  {
    id: 'required',
    header: 'Required Content',
    cell: ({ row }) => row.original.requiredContent.length,
  },
  {
    id: 'optional',
    header: 'Optional Content',
    cell: ({ row }) => row.original.optionalContent.length,
  },
];

// Component Viewer (F8): "Display every generated component... Read-only.
// Do not render editable components." A `<DataTable/>` summary (per the
// founder's explicit UI-reuse instruction) plus a full read-only detail
// card per component below it — no input, no form, no mutation call
// anywhere on this page.
export function ComponentViewer({ leadId }: ComponentViewerProps) {
  const { data: manifest, isLoading, error, refetch } = useComponentManifest(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/website-generator/${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Website Overview
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Components</h1>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !manifest ? (
        <p className="text-(--color-text-secondary) text-sm">
          No components have been generated for this lead yet.
        </p>
      ) : (
        <>
          <DetailCard title="Manifest Metadata">
            <FieldRow label="Component Engine Version">{manifest.componentEngineVersion}</FieldRow>
            <FieldRow label="Configuration Version">{manifest.configVersion}</FieldRow>
            <FieldRow label="Created">{new Date(manifest.createdAt).toLocaleString()}</FieldRow>
          </DetailCard>

          <DataTable
            columns={COLUMNS}
            data={manifest.components}
            getRowId={(row) => row.componentId}
            emptyTitle="No components"
            sorting={{ mode: 'client' }}
            enableGlobalFilter
            globalFilterPlaceholder="Search components…"
          />

          <div className="grid gap-4 md:grid-cols-2">
            {manifest.components.map((component) => (
              <DetailCard key={component.componentId} title={component.componentId}>
                <FieldRow label="Component Type">{component.componentType}</FieldRow>
                <FieldRow label="Parent">{component.parentComponentId ?? '—'}</FieldRow>
                <ListField label="Child Components" items={component.childComponentIds} />

                <FieldRow label="Visibility">
                  {component.visibility.mode === 'always'
                    ? 'Always'
                    : `Conditional: ${component.visibility.condition}`}
                </FieldRow>
                <FieldRow label="Responsive Rule">{component.responsiveRules.rule}</FieldRow>
                <FieldRow label="Accessibility Role">{component.accessibility.role}</FieldRow>
                <FieldRow label="Min Touch Target">
                  {component.accessibility.minTouchTargetPx}px
                </FieldRow>
                <FieldRow label="Contrast Level">{component.accessibility.contrastLevel}</FieldRow>

                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-(--color-text-secondary)">Theme Token References</span>
                  {Object.keys(component.themeTokens).length > 0 ? (
                    <ul className="text-(--color-text-primary) list-inside list-disc">
                      {Object.entries(component.themeTokens).map(([key, ref]) => (
                        <li key={key}>
                          {key}: {ref}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-(--color-text-secondary)">None</span>
                  )}
                </div>

                <ListField
                  label="Required Content Slots"
                  items={component.requiredContent.map((slot) => `${slot.slotName} (${slot.kind})`)}
                />
                <ListField
                  label="Optional Content Slots"
                  items={component.optionalContent.map((slot) => `${slot.slotName} (${slot.kind})`)}
                />
                <ListField
                  label="Placeholders"
                  items={component.placeholders.map(
                    (placeholder) => `${placeholder.placeholderLabel} — ${placeholder.slotName}`,
                  )}
                />
              </DetailCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
