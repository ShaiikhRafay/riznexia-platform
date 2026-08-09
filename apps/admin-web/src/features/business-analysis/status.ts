import type { AnalysisStatus } from '@riznexia/shared-types';
import type { StatusBadgeProps } from '@riznexia/ui';

// The feature-local half of StatusBadge's generic/specific split (same
// pattern as Discovery's status.ts, Leads' lead-stage.ts, and Place
// Sync's status.ts). Verified directly against the Prisma
// `AnalysisStatus` enum — `pending | completed | failed`, only three
// values; there is no separate "running"/"processing" state, since the
// AI call is fire-and-forget from the HTTP request's perspective, not a
// multi-step job with its own intermediate states.
export const ANALYSIS_STATUS_PRESENTATION: Record<
  AnalysisStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  pending: { variant: 'info', label: 'Pending' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'danger', label: 'Failed' },
};

export const ANALYSIS_STATUS_OPTIONS = (
  Object.keys(ANALYSIS_STATUS_PRESENTATION) as AnalysisStatus[]
).map((status) => ({
  value: status,
  label: ANALYSIS_STATUS_PRESENTATION[status].label,
}));

const TERMINAL_STATUSES: readonly AnalysisStatus[] = ['completed', 'failed'];

export function isTerminalAnalysisStatus(status: AnalysisStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
