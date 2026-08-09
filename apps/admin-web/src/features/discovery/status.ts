import type { DiscoveryJobStatus } from '@riznexia/shared-types';
import type { StatusBadgeProps } from '@riznexia/ui';

// The feature-local half of StatusBadge's generic/specific split
// (packages/ui's StatusBadge has no idea what "queued" means) — maps the
// backend's own DISCOVERY_JOB_STATUSES onto a tone + label. Also the one
// place that decides which statuses are "still in progress" for polling
// purposes (use-discovery-job.ts) and which are terminal.
export const DISCOVERY_STATUS_PRESENTATION: Record<
  DiscoveryJobStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  queued: { variant: 'neutral', label: 'Queued' },
  running: { variant: 'info', label: 'Running' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'danger', label: 'Failed' },
};

export const DISCOVERY_STATUS_OPTIONS = (
  Object.keys(DISCOVERY_STATUS_PRESENTATION) as DiscoveryJobStatus[]
).map((status) => ({
  value: status,
  label: DISCOVERY_STATUS_PRESENTATION[status].label,
}));

const TERMINAL_STATUSES: readonly DiscoveryJobStatus[] = ['completed', 'failed'];

export function isTerminalDiscoveryStatus(status: DiscoveryJobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
