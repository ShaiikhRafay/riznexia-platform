'use client';

import type { Lead, LeadCRM, SalesStage } from '@riznexia/shared-types';
import { StatusBadge } from '@riznexia/ui';
import { LeadCard } from './lead-card';

export interface StageColumnProps {
  stage: SalesStage;
  leads: Lead[];
  crmByLeadId: Record<string, LeadCRM | undefined>;
  allStages: readonly SalesStage[];
  isDropTarget: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (leadId: string) => void;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onMoveToStage: (leadId: string, stageId: string) => void;
}

// Stage Column (F10 Pipeline Board): "Show: ... Stage Counts." Count and
// total deal value are computed client-side from the currently-loaded
// (bounded) lead set only — a real, honest count of what's on screen, not
// a claim about the entire pipeline (that's `pipelineValueByStage` on the
// CRM Dashboard/Reports pages instead, which IS a true aggregate from the
// backend).
export function StageColumn({
  stage,
  leads,
  crmByLeadId,
  allStages,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onMoveToStage,
}: StageColumnProps) {
  const totalValue = leads.reduce(
    (sum, lead) => sum + (crmByLeadId[lead.id]?.dealValueUsd ?? 0),
    0,
  );

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        const leadId = event.dataTransfer.getData('text/plain');
        if (leadId) {
          onDrop(leadId);
        }
      }}
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-lg border p-3 ${
        isDropTarget
          ? 'border-(--color-accent) bg-(--color-bg-surface-raised)'
          : 'border-(--color-border-default) bg-(--color-bg-surface)'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-(--color-text-primary) text-sm font-semibold">{stage.name}</h2>
        <StatusBadge
          variant={stage.isWon ? 'success' : stage.isLost ? 'danger' : 'info'}
          label={String(leads.length)}
        />
      </div>
      <p className="text-(--color-text-secondary) text-xs">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(totalValue)}
      </p>
      <div className="flex flex-col gap-2">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            crm={crmByLeadId[lead.id]}
            stages={allStages}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onMoveToStage={onMoveToStage}
          />
        ))}
        {leads.length === 0 ? (
          <p className="text-(--color-text-secondary) text-xs">No leads in this stage.</p>
        ) : null}
      </div>
    </div>
  );
}
