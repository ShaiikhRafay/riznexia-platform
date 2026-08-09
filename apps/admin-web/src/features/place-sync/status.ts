import type { PlaceSyncJobStatus } from '@riznexia/shared-types';
import type { StatusBadgeProps } from '@riznexia/ui';

// The feature-local half of StatusBadge's generic/specific split (same
// pattern as Discovery's status.ts and Leads' lead-stage.ts) — maps the
// backend's own PLACE_SYNC_JOB_STATUSES onto a tone + label. Also the one
// place that decides which statuses are terminal for polling purposes
// (use-place-sync-job.ts).
//
// Verified directly against the Prisma `PlaceSyncJobStatus` enum
// (QUEUED/RUNNING/COMPLETED/FAILED/PARTIAL) — there is no `CANCELLED`
// value for this job type (that belongs to the unrelated CRM `TaskStatus`
// enum), so it is deliberately not one of the five variants below.
export const PLACE_SYNC_STATUS_PRESENTATION: Record<
  PlaceSyncJobStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  queued: { variant: 'neutral', label: 'Queued' },
  running: { variant: 'info', label: 'Running' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'danger', label: 'Failed' },
  partial: { variant: 'warning', label: 'Partial' },
};

export const PLACE_SYNC_STATUS_OPTIONS = (
  Object.keys(PLACE_SYNC_STATUS_PRESENTATION) as PlaceSyncJobStatus[]
).map((status) => ({
  value: status,
  label: PLACE_SYNC_STATUS_PRESENTATION[status].label,
}));

// `partial` (some businesses succeeded, some failed) is a real terminal
// outcome distinct from both `completed` and `failed` — the run finished,
// it just didn't fully succeed. Included here so polling stops for it too.
const TERMINAL_STATUSES: readonly PlaceSyncJobStatus[] = ['completed', 'failed', 'partial'];

export function isTerminalPlaceSyncStatus(status: PlaceSyncJobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
