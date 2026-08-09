'use client';

import type { Lead, LeadCRM, SalesStage } from '@riznexia/shared-types';
import { Card } from '@riznexia/ui';
import Link from 'next/link';

export interface LeadCardProps {
  lead: Lead;
  crm: LeadCRM | undefined;
  stages: readonly SalesStage[];
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onMoveToStage: (leadId: string, stageId: string) => void;
}

// Lead Card (F10 Pipeline Board): "Show: Lead Cards, Stage Counts, Deal
// Value, Assigned User, Current Stage." `LeadCRM` has no business
// name/city/category — those come from `Lead` (`GET /leads`), joined
// client-side per card. Real HTML5 `draggable` (not a fake drop target
// that silently does nothing) — `onDragStart`/`onDragEnd` only manage
// which lead is being dragged; the actual stage change happens in
// `PipelineBoardPage`'s `onDrop`, via the one real transition endpoint.
// The `<select>` below is the explicit, keyboard-accessible fallback the
// founder's brief asks for ("Otherwise use explicit stage-change
// actions") — present alongside drag, not instead of it, since both call
// the same real mutation.
export function LeadCard({
  lead,
  crm,
  stages,
  onDragStart,
  onDragEnd,
  onMoveToStage,
}: LeadCardProps) {
  return (
    <Card
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', lead.id);
        onDragStart(lead.id);
      }}
      onDragEnd={onDragEnd}
      className="cursor-grab gap-2 p-3 active:cursor-grabbing"
    >
      <Link
        href={`/crm/leads/${lead.id}`}
        className="text-(--color-text-primary) text-sm font-medium hover:underline"
      >
        {lead.businessName}
      </Link>
      <p className="text-(--color-text-secondary) text-xs">
        {crm?.dealValueUsd !== null && crm?.dealValueUsd !== undefined
          ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(crm.dealValueUsd)
          : 'No deal value'}
      </p>
      <p className="text-(--color-text-secondary) text-xs">
        {crm?.ownerId ? `Owner: ${crm.ownerId}` : 'Unassigned'}
      </p>
      <select
        aria-label={`Move ${lead.businessName} to stage`}
        value={crm?.stageId ?? ''}
        onChange={(event) => onMoveToStage(lead.id, event.target.value)}
        className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) mt-1 h-8 w-full rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-2"
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </select>
    </Card>
  );
}
