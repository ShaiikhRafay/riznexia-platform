'use client';

import type { PlaceSyncJob } from '@riznexia/shared-types';
import { Button, DataTableColumnHeader, StatusBadge, type ColumnDef } from '@riznexia/ui';
import Link from 'next/link';
import { PLACE_SYNC_STATUS_OPTIONS, PLACE_SYNC_STATUS_PRESENTATION } from '../status';

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

// Sync Job History columns (F5) — City/Category are free-text (the search
// params a job was started with, not a closed taxonomy — same reasoning
// as Discovery History's own category column); Status is a select filter
// over the closed 5-value enum; Started At/Completed At map directly to
// `startedAt`/`finishedAt`; Imported/Updated/Failed map to
// `businessesCreated`/`businessesUpdated`/`businessesFailed` — the
// backend's real field names, not the founder brief's generic labels.
export const PLACE_SYNC_HISTORY_COLUMNS: ColumnDef<PlaceSyncJob, unknown>[] = [
  {
    accessorKey: 'city',
    header: ({ column }) => <DataTableColumnHeader column={column} title="City" />,
    cell: ({ row }) => row.original.city ?? '—',
    meta: { label: 'City', filterVariant: 'text' },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => row.original.category ?? '—',
    meta: { label: 'Category', filterVariant: 'text' },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const presentation = PLACE_SYNC_STATUS_PRESENTATION[row.original.status];
      return <StatusBadge variant={presentation.variant} label={presentation.label} />;
    },
    meta: { label: 'Status', filterVariant: 'select', filterOptions: PLACE_SYNC_STATUS_OPTIONS },
  },
  {
    accessorKey: 'startedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Started At" />,
    cell: ({ row }) => formatTimestamp(row.original.startedAt),
  },
  {
    accessorKey: 'finishedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Completed At" />,
    cell: ({ row }) => formatTimestamp(row.original.finishedAt),
  },
  {
    accessorKey: 'businessesCreated',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Imported" />,
  },
  {
    accessorKey: 'businessesUpdated',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
  },
  {
    accessorKey: 'businessesFailed',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Failed" />,
  },
  {
    id: 'actions',
    header: () => null,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/discovery/sync/${row.original.id}`}>View</Link>
      </Button>
    ),
  },
];
