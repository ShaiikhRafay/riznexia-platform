import type { LeadActivity } from '@riznexia/shared-types';
import { describeActivityDetail, LEAD_ACTIVITY_LABELS } from '../activity-labels';

// Shared read-only activity row renderer (F10) — used by both Lead CRM
// Details' Timeline section (unfiltered) and the Activities page's
// per-category tabs (filtered). Every row shows exactly what the backend
// returned: its real `type`'s label, timestamp, and `detail` (only when
// it's the common `{from, to}` shape) — never merged or reclassified.
export function ActivityList({ activities }: { activities: readonly LeadActivity[] }) {
  if (activities.length === 0) {
    return <p className="text-(--color-text-secondary) text-sm">No activity yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {activities.map((activity) => {
        const detail = describeActivityDetail(activity.detail);
        return (
          <li key={activity.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-(--color-text-primary)">
              {LEAD_ACTIVITY_LABELS[activity.type]}
              {detail ? <span className="text-(--color-text-secondary)"> ({detail})</span> : null}
            </span>
            <span className="text-(--color-text-secondary) shrink-0">
              {new Date(activity.createdAt).toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
