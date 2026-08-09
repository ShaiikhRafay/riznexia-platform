'use client';

import type { Lead } from '@riznexia/shared-types';
import { DataTableColumnHeader, StatusBadge, type ColumnDef } from '@riznexia/ui';
import { LEAD_STAGE_PRESENTATION } from '../lead-stage';
import { AssignedToCell } from './assigned-to-cell';
import { LeadRowActions } from './lead-row-actions';

// Column ids for sortable columns match `LEAD_SORT_FIELDS` exactly
// (createdAt/updatedAt/pipelineStage/businessName) — the whitelist
// `GET /leads?sort=` actually accepts (verified against
// leads.service.ts). Every other column has `enableSorting: false`, since
// the backend has no server-side sort for city/category/tags/assignedTo.
export const LEAD_LIST_COLUMNS: ColumnDef<Lead, unknown>[] = [
  {
    accessorKey: 'businessName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Business" />,
  },
  {
    accessorKey: 'city',
    header: 'City',
    enableSorting: false,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    enableSorting: false,
  },
  {
    accessorKey: 'pipelineStage',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stage" />,
    cell: ({ row }) => {
      const presentation = LEAD_STAGE_PRESENTATION[row.original.pipelineStage];
      return <StatusBadge variant={presentation.variant} label={presentation.label} />;
    },
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.map((tag) => (
            <span
              key={tag}
              className="bg-(--color-bg-surface-raised) text-caption text-(--color-text-primary) rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-(--color-text-secondary)">—</span>
      ),
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned',
    enableSorting: false,
    cell: ({ row }) => <AssignedToCell assignedTo={row.original.assignedTo} />,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    id: 'actions',
    header: () => null,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <LeadRowActions lead={row.original} />,
  },
];
