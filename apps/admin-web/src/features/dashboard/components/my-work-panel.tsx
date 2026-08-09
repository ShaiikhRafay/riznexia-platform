'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useMyTasks } from '../api/use-my-tasks';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// The fallback dashboard section for a role holding neither `analytics:view`
// nor `crm:report` (today, only `sales_executive`) — a short worklist from
// data they already have access to, not an aggregate dashboard, per the
// approved F2 architecture's resolution to its own open question.
export function MyWorkPanel() {
  const { data, isLoading, error, refetch } = useMyTasks();

  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">My Work</h2>
        <p className="text-caption text-(--color-text-secondary)">
          Your most recent assigned tasks
        </p>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data && data.items.length > 0 ? (
        <ul className="divide-(--color-border-default) flex flex-col divide-y">
          {data.items.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-4 py-2">
              <div className="flex flex-col">
                <span className="text-(--color-text-primary) text-sm">{task.title}</span>
                <span className="text-caption text-(--color-text-secondary)">
                  Due {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
              <span className="text-caption text-(--color-text-secondary)">
                {STATUS_LABEL[task.status] ?? task.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-(--color-text-secondary) text-sm">No tasks assigned to you right now.</p>
      )}
    </section>
  );
}
