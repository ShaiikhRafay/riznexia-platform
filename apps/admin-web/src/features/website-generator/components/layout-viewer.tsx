'use client';

import { Button, ErrorState, Skeleton } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLayoutConfiguration } from '../api/use-layout-configuration';
import { DetailCard, FieldRow } from './detail-primitives';

export interface LayoutViewerProps {
  leadId: string;
}

// Layout Viewer (F8): "Display the generated layout exactly as returned
// by the backend... Read-only. Never modify layout." No form, no input,
// no mutation call anywhere on this page — it only calls
// `useLayoutConfiguration` (GET).
export function LayoutViewer({ leadId }: LayoutViewerProps) {
  const { data: layout, isLoading, error, refetch } = useLayoutConfiguration(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/website-generator/${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Website Overview
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Layout</h1>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !layout ? (
        <p className="text-(--color-text-secondary) text-sm">
          No layout has been generated for this lead yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard title="Layout Metadata">
            <FieldRow label="Layout Engine Version">{layout.layoutEngineVersion}</FieldRow>
            <FieldRow label="Configuration Version">{layout.configVersion}</FieldRow>
            <FieldRow label="Created">{new Date(layout.createdAt).toLocaleString()}</FieldRow>
          </DetailCard>

          <DetailCard title="Sections & Order (Layout Structure)">
            {layout.pageStructure.length > 0 ? (
              <ol className="flex flex-col gap-1 text-sm">
                {[...layout.pageStructure]
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <li key={section.sectionId} className="flex items-center justify-between">
                      <span className="text-(--color-text-primary)">
                        {section.order}. {section.sectionId}
                      </span>
                      <span className="text-(--color-text-secondary)">{section.layoutType}</span>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="text-(--color-text-secondary) text-sm">No sections.</p>
            )}
          </DetailCard>

          <DetailCard title="Component Hierarchy">
            {layout.componentPlaceholders.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {layout.componentPlaceholders.map((placeholder) => (
                  <li key={placeholder.componentId} className="flex items-center justify-between">
                    <span className="text-(--color-text-primary)">{placeholder.componentId}</span>
                    <span className="text-(--color-text-secondary)">
                      {placeholder.sectionId} &middot; #{placeholder.order}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-(--color-text-secondary) text-sm">No component placeholders.</p>
            )}
          </DetailCard>

          <DetailCard title="Navigation">
            <FieldRow label="Style">{layout.navigation.style}</FieldRow>
            <FieldRow label="Position">{layout.navigation.position}</FieldRow>
            <FieldRow label="Sticky">{layout.navigation.sticky ? 'Yes' : 'No'}</FieldRow>
            <FieldRow label="Mobile Behavior">{layout.navigation.mobileBehavior}</FieldRow>
            <FieldRow label="Items">{layout.navigation.items.join(', ') || '—'}</FieldRow>
          </DetailCard>

          <DetailCard title="Hero">
            <FieldRow label="Style">{layout.hero.style}</FieldRow>
            <FieldRow label="Media Position">{layout.hero.mediaPosition}</FieldRow>
            <FieldRow label="Content Alignment">{layout.hero.contentAlignment}</FieldRow>
            <FieldRow label="CTA Slots">{layout.hero.ctaSlots}</FieldRow>
          </DetailCard>

          <DetailCard title="Footer">
            <FieldRow label="Style">{layout.footer.style}</FieldRow>
            <FieldRow label="Columns">{layout.footer.columns}</FieldRow>
            <FieldRow label="Newsletter">
              {layout.footer.includesNewsletter ? 'Yes' : 'No'}
            </FieldRow>
            <FieldRow label="Social Links">
              {layout.footer.includesSocialLinks ? 'Yes' : 'No'}
            </FieldRow>
          </DetailCard>

          {layout.sidebar ? (
            <DetailCard title="Sidebar">
              <FieldRow label="Position">{layout.sidebar.position}</FieldRow>
              <FieldRow label="Width">{layout.sidebar.width}</FieldRow>
              <FieldRow label="Sticky">{layout.sidebar.sticky ? 'Yes' : 'No'}</FieldRow>
            </DetailCard>
          ) : null}

          <DetailCard title="Grid">
            {layout.grid.map((grid) => (
              <FieldRow key={grid.sectionId} label={grid.sectionId}>
                {grid.columns.mobile}/{grid.columns.tablet}/{grid.columns.desktop} cols &middot;{' '}
                {grid.gap} gap
              </FieldRow>
            ))}
          </DetailCard>

          <DetailCard title="Responsive Rules">
            <FieldRow label="Breakpoints">
              {layout.responsiveRules.breakpoints.mobile}/
              {layout.responsiveRules.breakpoints.tablet}/
              {layout.responsiveRules.breakpoints.desktop}/{layout.responsiveRules.breakpoints.wide}
              px
            </FieldRow>
            <FieldRow label="Stacked Layout">
              {layout.responsiveRules.stackedLayout ? 'Yes' : 'No'}
            </FieldRow>
            <FieldRow label="Tap Target Size">{layout.responsiveRules.tapTargetSizePx}px</FieldRow>
          </DetailCard>

          <DetailCard title="CTA Placements">
            {layout.ctaPlacements.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {layout.ctaPlacements.map((cta, index) => (
                  <li key={`${cta.zone}-${index}`} className="flex items-center justify-between">
                    <span className="text-(--color-text-primary)">{cta.ctaText}</span>
                    <span className="text-(--color-text-secondary)">
                      {cta.zone} &middot; {cta.style}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-(--color-text-secondary) text-sm">No CTA placements.</p>
            )}
          </DetailCard>
        </div>
      )}
    </div>
  );
}
