import type { Lead } from '@riznexia/shared-types';
import { StatusBadge } from '@riznexia/ui';
import { LEAD_STAGE_PRESENTATION } from '../../lead-stage';
import { AssignedToCell } from '../assigned-to-cell';
import { DetailCard } from './detail-card';
import { FieldRow } from './field-row';

// Status, Tags, Assigned User (F4) — the three lead-state fields
// `GET /leads/:id` returns beyond the business join.
export function LeadStatusSection({ lead }: { lead: Lead }) {
  const presentation = LEAD_STAGE_PRESENTATION[lead.pipelineStage];
  return (
    <DetailCard title="Status">
      <FieldRow label="Stage">
        <StatusBadge variant={presentation.variant} label={presentation.label} />
      </FieldRow>
      <FieldRow label="Assigned User">
        <AssignedToCell assignedTo={lead.assignedTo} />
      </FieldRow>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-(--color-text-secondary)">Tags</span>
        {lead.tags.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1">
            {lead.tags.map((tag) => (
              <span
                key={tag}
                className="bg-(--color-bg-surface-raised) text-caption text-(--color-text-primary) rounded-full px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-(--color-text-primary)">—</span>
        )}
      </div>
    </DetailCard>
  );
}
