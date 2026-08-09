'use client';

import type { DiscoveryJob } from '@riznexia/shared-types';
import { Button, DataTableColumnHeader, StatusBadge, type ColumnDef } from '@riznexia/ui';
import Link from 'next/link';
import { DISCOVERY_STATUS_OPTIONS, DISCOVERY_STATUS_PRESENTATION } from '../status';

// Column definitions are the one place Discovery's own domain knowledge
// (what a "city"/"category"/"status" is) meets the generic DataTable —
// the table itself never sees a DiscoveryJob, only these column defs.
export const DISCOVERY_HISTORY_COLUMNS: ColumnDef<DiscoveryJob, unknown>[] = [
  {
    accessorKey: 'city',
    header: ({ column }) => <DataTableColumnHeader column={column} title="City" />,
    meta: { label: 'City', filterVariant: 'text' },
  },
  {
    // Free-text filter, not a select — the backend has no closed set of
    // categories (any string a rep typed into the search form), so
    // "select from known values" would be a fabricated taxonomy the API
    // doesn't actually have.
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    meta: { label: 'Category', filterVariant: 'text' },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const presentation = DISCOVERY_STATUS_PRESENTATION[row.original.status];
      return <StatusBadge variant={presentation.variant} label={presentation.label} />;
    },
    meta: { label: 'Status', filterVariant: 'select', filterOptions: DISCOVERY_STATUS_OPTIONS },
  },
  {
    accessorKey: 'resultsCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Results" />,
  },
  {
    id: 'actions',
    header: () => null,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/discovery/${row.original.id}`}>View</Link>
      </Button>
    ),
  },
];
