import type { ProposalStatus, TaskPriority, TaskStatus } from '@riznexia/shared-types';
import type { StatusBadgeProps } from '@riznexia/ui';

// The feature-local half of StatusBadge's generic/specific split (same
// pattern as Discovery's status.ts, Business Analysis's status.ts, Place
// Sync's status.ts). `TaskStatus` verified directly against
// `TASK_STATUSES` in `crm-task.ts` — 4 values, no frontend-invented state.
export const TASK_STATUS_PRESENTATION: Record<
  TaskStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  pending: { variant: 'neutral', label: 'Pending' },
  in_progress: { variant: 'info', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
};

export const TASK_STATUS_OPTIONS = (Object.keys(TASK_STATUS_PRESENTATION) as TaskStatus[]).map(
  (status) => ({
    value: status,
    label: TASK_STATUS_PRESENTATION[status].label,
  }),
);

export const TASK_PRIORITY_PRESENTATION: Record<
  TaskPriority,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  low: { variant: 'neutral', label: 'Low' },
  medium: { variant: 'info', label: 'Medium' },
  high: { variant: 'warning', label: 'High' },
  urgent: { variant: 'danger', label: 'Urgent' },
};

export const TASK_PRIORITY_OPTIONS = (
  Object.keys(TASK_PRIORITY_PRESENTATION) as TaskPriority[]
).map((priority) => ({
  value: priority,
  label: TASK_PRIORITY_PRESENTATION[priority].label,
}));

// `ProposalStatus` has 6 enum values but only 4 are ever settable via the
// API (`SETTABLE_PROPOSAL_STATUSES`) — `draft` is the fixed creation
// status and `edited` is never produced by any M10 code path (confirmed
// against `sales-proposal.ts`'s own comment); both are still given a
// presentation here since the read schema technically allows them.
export const PROPOSAL_STATUS_PRESENTATION: Record<
  ProposalStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  draft: { variant: 'neutral', label: 'Draft' },
  edited: { variant: 'neutral', label: 'Edited' },
  sent_manually: { variant: 'info', label: 'Sent' },
  viewed: { variant: 'info', label: 'Viewed' },
  accepted: { variant: 'success', label: 'Accepted' },
  rejected: { variant: 'danger', label: 'Rejected' },
};
