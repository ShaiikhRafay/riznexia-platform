'use client';

import type { DeploymentHealthCheck } from '@riznexia/shared-types';
import { StatusBadge, type ColumnDef } from '@riznexia/ui';
import { formatDateTime, formatDurationMs } from '../format';
import { parseHealthCheckDetail } from '../health-check-detail';
import { HEALTH_STATUS_PRESENTATION } from '../status';

// `GET /leads/:id/deployments/:deploymentId/health` orders by
// `checkedAt desc` server-side (verified against
// `health-check-engine.service.ts`) — no client sort param, same
// `enableSorting: false` convention as F11's other tables.
export const HEALTH_CHECK_COLUMNS: ColumnDef<DeploymentHealthCheck, unknown>[] = [
  {
    accessorKey: 'checkedAt',
    header: 'Last Check',
    enableSorting: false,
    cell: ({ row }) => formatDateTime(row.original.checkedAt),
  },
  {
    accessorKey: 'status',
    header: 'Health Status',
    enableSorting: false,
    cell: ({ row }) => <StatusBadge {...HEALTH_STATUS_PRESENTATION[row.original.status]} />,
  },
  {
    accessorKey: 'responseTimeMs',
    header: 'Response Time',
    enableSorting: false,
    cell: ({ row }) => formatDurationMs(row.original.responseTimeMs),
  },
  {
    accessorKey: 'httpStatusCode',
    header: 'HTTP Status',
    enableSorting: false,
    cell: ({ row }) => row.original.httpStatusCode ?? '—',
  },
  {
    id: 'passedChecks',
    header: 'Passed Checks',
    enableSorting: false,
    cell: ({ row }) => {
      const checks = parseHealthCheckDetail(row.original.detail);
      return checks.filter((check) => check.passed).length;
    },
  },
  {
    id: 'failedChecks',
    header: 'Failed Checks',
    enableSorting: false,
    cell: ({ row }) => {
      const checks = parseHealthCheckDetail(row.original.detail);
      return checks.filter((check) => !check.passed).length;
    },
  },
];
