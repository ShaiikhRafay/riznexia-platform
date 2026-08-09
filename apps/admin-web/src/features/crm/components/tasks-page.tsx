'use client';

import type { TaskStatus } from '@riznexia/shared-types';
import { DataTable } from '@riznexia/ui';
import { useEffect, useRef, useState } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { useCurrentUser } from '@/src/lib/current-user-context';
import { useCrmTasks } from '../api/use-crm-tasks';
import { TASK_STATUS_OPTIONS } from '../status';
import { CreateTaskDialog } from './create-task-dialog';
import { CrmViewGate } from './crm-view-gate';
import { TASK_LIST_COLUMNS } from './task-list-columns';

const PAGE_SIZE = 25;

// Tasks (F10): `GET /crm/tasks` is genuinely cross-lead and
// cursor-paginated server-side — same bidirectional Prev/Next-over-a-
// forward-only-cursor pattern F4's Lead List already established.
export function TasksPage() {
  const currentUser = useCurrentUser();
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const effectiveStatus = status === 'all' ? undefined : status;
  const effectiveAssignedTo = assignedToMe ? currentUser.id : undefined;

  const filterKey = JSON.stringify([effectiveStatus, effectiveAssignedTo]);
  const previousFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (previousFilterKeyRef.current !== filterKey) {
      previousFilterKeyRef.current = filterKey;
      setCursorHistory([undefined]);
      setPageIndex(0);
    }
  }, [filterKey]);

  const { data, isLoading, isFetching, error, refetch } = useCrmTasks({
    cursor: cursorHistory[pageIndex],
    limit: PAGE_SIZE,
    status: effectiveStatus,
    assignedToId: effectiveAssignedTo,
  });

  return (
    <CrmViewGate>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">Tasks</h1>
          <PermissionGate permission="crm:manage">
            <CreateTaskDialog />
          </PermissionGate>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-(--color-text-primary) flex items-center gap-2 text-sm">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}
              className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            >
              <option value="all">All</option>
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-(--color-text-primary) flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(event) => setAssignedToMe(event.target.checked)}
            />
            Assigned to me
          </label>
        </div>

        <DataTable
          columns={TASK_LIST_COLUMNS}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle="No tasks found"
          emptyDescription="Try adjusting your filters, or create a new task."
          pagination={{
            mode: 'server',
            pageSize: PAGE_SIZE,
            hasNextPage: !!data?.nextCursor,
            hasPreviousPage: pageIndex > 0,
            onNextPage: () => {
              if (data?.nextCursor) {
                const nextCursor = data.nextCursor;
                setCursorHistory((prev) => [...prev.slice(0, pageIndex + 1), nextCursor]);
                setPageIndex((index) => index + 1);
              }
            },
            onPreviousPage: () => setPageIndex((index) => Math.max(0, index - 1)),
            isFetching,
          }}
        />
      </div>
    </CrmViewGate>
  );
}
