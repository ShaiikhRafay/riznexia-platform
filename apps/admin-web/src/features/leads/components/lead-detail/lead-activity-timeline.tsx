'use client';

import { Button, ErrorState, Skeleton } from '@riznexia/ui';
import { useCurrentUser } from '@/src/lib/current-user-context';
import { useLeadActivity } from '../../api/use-lead-activity';
import { describeActivityDetail, LEAD_ACTIVITY_LABELS } from '../../lead-activity-presentation';
import { DetailCard } from './detail-card';

// Activity Timeline (F4): `GET /leads/:id/activity`, read-only (no write
// endpoint exists — the frontend never creates an activity entry
// directly), newest-first per the backend's own ordering.
export function LeadActivityTimeline({ leadId }: { leadId: string }) {
  const currentUser = useCurrentUser();
  const activityQuery = useLeadActivity(leadId);
  const activities = activityQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <DetailCard title="Activity Timeline">
      {activityQuery.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : activityQuery.error ? (
        <ErrorState
          error={activityQuery.error as never}
          onRetry={() => void activityQuery.refetch()}
        />
      ) : activities.length === 0 ? (
        <p className="text-(--color-text-secondary) text-sm">No activity yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {activities.map((activity) => {
            const detail = describeActivityDetail(activity.detail);
            return (
              <li
                key={activity.id}
                className="border-(--color-border-default) flex items-start justify-between gap-4 border-b pb-3 text-sm last:border-none last:pb-0"
              >
                <div>
                  <p className="text-(--color-text-primary) font-medium">
                    {LEAD_ACTIVITY_LABELS[activity.type]}
                  </p>
                  {detail ? (
                    <p className="text-(--color-text-secondary) text-xs">{detail}</p>
                  ) : null}
                  <p className="text-(--color-text-secondary) text-xs">
                    {activity.actorId === currentUser.id ? 'You' : (activity.actorId ?? 'System')}
                  </p>
                </div>
                <span className="text-(--color-text-secondary) whitespace-nowrap text-xs">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {activityQuery.hasNextPage ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void activityQuery.fetchNextPage()}
          loading={activityQuery.isFetchingNextPage}
          className="self-start"
        >
          Load more
        </Button>
      ) : null}
    </DetailCard>
  );
}
