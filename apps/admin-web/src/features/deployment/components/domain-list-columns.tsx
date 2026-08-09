'use client';

import type { Domain } from '@riznexia/shared-types';
import { StatusBadge, type ColumnDef } from '@riznexia/ui';
import Link from 'next/link';
import { DOMAIN_VERIFICATION_STATUS_PRESENTATION, SSL_STATUS_PRESENTATION } from '../status';
import { DomainRowActions } from './domain-row-actions';

// `GET /leads/:id/domains` returns a plain array (not sortable/paginated
// server-side), so every column is `enableSorting: false`, same as F8's
// summary tables. "DNS Status" from the founder's brief has no dedicated
// backend field (verified against `domain.ts`) — the closest real field,
// `verificationRecord`, is shown instead under its own real name rather
// than mislabeled.
export function buildDomainListColumns(leadId: string): ColumnDef<Domain, unknown>[] {
  return [
    {
      accessorKey: 'hostname',
      header: 'Domain Name',
      enableSorting: false,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: false,
    },
    {
      accessorKey: 'verificationStatus',
      header: 'Verification Status',
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge
          {...DOMAIN_VERIFICATION_STATUS_PRESENTATION[row.original.verificationStatus]}
        />
      ),
    },
    {
      accessorKey: 'sslStatus',
      header: 'SSL Status',
      enableSorting: false,
      cell: ({ row }) => <StatusBadge {...SSL_STATUS_PRESENTATION[row.original.sslStatus]} />,
    },
    {
      id: 'connectedDeployment',
      header: 'Connected Deployment',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.currentDeploymentId ? (
          <Link
            href={`/deployment/${leadId}/deployments/${row.original.currentDeploymentId}`}
            className="text-(--color-accent) hover:underline"
          >
            View Deployment
          </Link>
        ) : (
          <span className="text-(--color-text-secondary)">None</span>
        ),
    },
    {
      id: 'verificationRecord',
      header: 'Verification Record',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.verificationRecord ? (
          <code className="text-(--color-text-secondary) text-xs">
            {JSON.stringify(row.original.verificationRecord)}
          </code>
        ) : (
          <span className="text-(--color-text-secondary)">—</span>
        ),
    },
    {
      id: 'actions',
      header: () => null,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <DomainRowActions leadId={leadId} domain={row.original} />,
    },
  ];
}
