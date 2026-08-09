'use client';

import type { WebsiteDeployment } from '@riznexia/shared-types';
import { StatusBadge, type ColumnDef } from '@riznexia/ui';
import Link from 'next/link';
import { formatDateTime, formatDurationMs } from '../format';
import { DEPLOYMENT_PROVIDER_LABELS, DEPLOYMENT_STATUS_PRESENTATION } from '../status';
import { TRIGGER_TYPE_LABELS, getTriggerType } from '../trigger-type';

// Column ids match what `GET /leads/:id/deployments` actually orders by
// (`deploymentVersion desc`, fixed server-side — verified against the e2e
// spec) — no client sort param exists for this endpoint, so every column
// here is `enableSorting: false`, same convention as F10's
// `task-list-columns.tsx`.
export function buildDeploymentHistoryColumns(
  leadId: string,
): ColumnDef<WebsiteDeployment, unknown>[] {
  return [
    {
      accessorKey: 'deploymentVersion',
      header: 'Version',
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          href={`/deployment/${leadId}/deployments/${row.original.id}`}
          className="text-(--color-accent) font-medium hover:underline"
        >
          v{row.original.deploymentVersion}
        </Link>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      enableSorting: false,
      cell: ({ row }) => DEPLOYMENT_PROVIDER_LABELS[row.original.provider],
    },
    {
      accessorKey: 'environment',
      header: 'Environment',
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <StatusBadge {...DEPLOYMENT_STATUS_PRESENTATION[row.original.status]} />,
    },
    {
      id: 'startedTime',
      header: 'Started Time',
      enableSorting: false,
      cell: ({ row }) => formatDateTime(row.original.buildStartedAt),
    },
    {
      id: 'finishedTime',
      header: 'Finished Time',
      enableSorting: false,
      cell: ({ row }) => formatDateTime(row.original.completedAt),
    },
    {
      id: 'duration',
      header: 'Duration',
      enableSorting: false,
      cell: ({ row }) => formatDurationMs(row.original.executionDuration),
    },
    {
      id: 'triggerType',
      header: 'Trigger Type',
      enableSorting: false,
      cell: ({ row }) => TRIGGER_TYPE_LABELS[getTriggerType(row.original)],
    },
  ];
}
