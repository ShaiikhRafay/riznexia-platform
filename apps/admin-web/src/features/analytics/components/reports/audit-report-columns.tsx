'use client';

import type { AuditReport } from '@riznexia/shared-types';
import type { ColumnDef } from '@riznexia/ui';
import { formatDateTime } from '../../format';

type AuditReportEntry = AuditReport['items'][number];

// `GET /analytics/reports/audit` orders newest-first server-side
// (`getAuditFacts`, cursor-paginated) — no client sort param, same
// `enableSorting: false` convention as every other report/history table
// in this app.
export const AUDIT_REPORT_COLUMNS: ColumnDef<AuditReportEntry, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Time',
    enableSorting: false,
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    enableSorting: false,
  },
  {
    accessorKey: 'entityType',
    header: 'Entity Type',
    enableSorting: false,
  },
  {
    accessorKey: 'entityId',
    header: 'Entity ID',
    enableSorting: false,
  },
  {
    accessorKey: 'actorId',
    header: 'Actor',
    enableSorting: false,
    cell: ({ row }) => row.original.actorId ?? 'System',
  },
];
