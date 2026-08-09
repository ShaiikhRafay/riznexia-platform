'use client';

import type { CrmTask } from '@riznexia/shared-types';
import { DataTableColumnHeader, StatusBadge, type ColumnDef } from '@riznexia/ui';
import { TASK_PRIORITY_PRESENTATION, TASK_STATUS_PRESENTATION } from '../status';
import { TaskRowActions } from './task-row-actions';

// Column ids for sortable columns match what `GET /crm/tasks` actually
// orders by (`dueDate asc`, fixed server-side — no client sort param
// exists for this endpoint), so every column here is `enableSorting:
// false`; sorting is not one of this DataTable's modes for this resource.
export const TASK_LIST_COLUMNS: ColumnDef<CrmTask, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    enableSorting: false,
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    enableSorting: false,
    cell: ({ row }) => {
      const presentation = TASK_PRIORITY_PRESENTATION[row.original.priority];
      return <StatusBadge variant={presentation.variant} label={presentation.label} />;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => {
      const presentation = TASK_STATUS_PRESENTATION[row.original.status];
      return <StatusBadge variant={presentation.variant} label={presentation.label} />;
    },
  },
  {
    accessorKey: 'dueDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
    enableSorting: false,
    cell: ({ row }) => new Date(row.original.dueDate).toLocaleString(),
  },
  {
    accessorKey: 'assignedToId',
    header: 'Assigned To',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.assignedToId ?? (
        <span className="text-(--color-text-secondary)">Unassigned</span>
      ),
  },
  {
    id: 'actions',
    header: () => null,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <TaskRowActions task={row.original} leadId={row.original.leadId} />,
  },
];
