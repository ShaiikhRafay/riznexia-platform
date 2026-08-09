import { PIPELINE_STAGES, type PipelineStage } from '@riznexia/shared-types';
import type { StatusBadgeProps } from '@riznexia/ui';

// The feature-local half of StatusBadge's generic/specific split (same
// pattern as Discovery's status.ts) — packages/ui's StatusBadge has no
// idea what "qualified" or "won" means; this maps the backend's own
// PIPELINE_STAGES onto a tone + label.
export const LEAD_STAGE_PRESENTATION: Record<
  PipelineStage,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  new: { variant: 'neutral', label: 'New' },
  qualified: { variant: 'info', label: 'Qualified' },
  contacted: { variant: 'info', label: 'Contacted' },
  in_discussion: { variant: 'warning', label: 'In Discussion' },
  won: { variant: 'success', label: 'Won' },
  lost: { variant: 'danger', label: 'Lost' },
};

export const LEAD_STAGE_OPTIONS = PIPELINE_STAGES.map((stage) => ({
  value: stage,
  label: LEAD_STAGE_PRESENTATION[stage].label,
}));
