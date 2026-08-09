'use client';

import { Button, DataTable, ErrorState, Skeleton, StatusBadge, toast } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useHealthChecks } from '../api/use-health-checks';
import { useTriggerHealthCheck } from '../api/use-trigger-health-check';
import { formatDateTime, formatDurationMs } from '../format';
import { parseHealthCheckDetail } from '../health-check-detail';
import { HEALTH_STATUS_PRESENTATION } from '../status';
import { HEALTH_CHECK_COLUMNS } from './health-check-columns';

const PAGE_SIZE = 25;

export interface HealthMonitoringPageProps {
  leadId: string;
  deploymentId: string;
}

// Health Monitoring (F11): "Display backend health checks exactly...
// Never compute health scores on the frontend." The summary row below
// reads every value directly off the most recent
// `GET .../health` row (Health Status, Response Time, Last Check, Passed/
// Failed Checks tallied from that same row's own `detail.checks` array) —
// no score, no weighting, nothing aggregated across history. "Run Health
// Check" triggers the backend's own real check
// (`POST .../health-check`), gated `deployment:manage`.
export function HealthMonitoringPage({ leadId, deploymentId }: HealthMonitoringPageProps) {
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const { data, isLoading, isFetching, error, refetch } = useHealthChecks(leadId, deploymentId, {
    cursor: cursorHistory[pageIndex],
    limit: PAGE_SIZE,
  });
  const triggerHealthCheck = useTriggerHealthCheck(leadId, deploymentId);

  function handleTrigger() {
    triggerHealthCheck
      .mutateAsync()
      .then(() => toast.success('Health check completed'))
      .catch((mutationError: unknown) => {
        const message =
          mutationError instanceof ApiError
            ? mutationError.message
            : 'Could not run a health check.';
        toast.error(message);
      });
  }

  const latest = pageIndex === 0 ? data?.items[0] : undefined;
  const latestChecks = latest ? parseHealthCheckDetail(latest.detail) : [];

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/deployment/${leadId}/deployments/${deploymentId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Deployment Details
        </Link>
      </Button>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Health Monitoring</h1>
        <PermissionGate permission="deployment:manage">
          <Button size="sm" onClick={handleTrigger} loading={triggerHealthCheck.isPending}>
            Run Health Check
          </Button>
        </PermissionGate>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : latest ? (
        <div className="border-(--color-border-default) bg-(--color-bg-surface) grid gap-3 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryStat label="Health Status">
            <StatusBadge {...HEALTH_STATUS_PRESENTATION[latest.status]} />
          </SummaryStat>
          <SummaryStat label="Response Time">{formatDurationMs(latest.responseTimeMs)}</SummaryStat>
          <SummaryStat label="Last Check">{formatDateTime(latest.checkedAt)}</SummaryStat>
          <SummaryStat label="Passed Checks">
            {latestChecks.filter((check) => check.passed).length}
          </SummaryStat>
          <SummaryStat label="Failed Checks">
            {latestChecks.filter((check) => !check.passed).length}
          </SummaryStat>
        </div>
      ) : (
        <p className="text-(--color-text-secondary) text-sm">
          No health checks have run for this deployment yet.
        </p>
      )}

      <DataTable
        columns={HEALTH_CHECK_COLUMNS}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No health checks found"
        emptyDescription="Run a health check to see results here."
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
  );
}

function SummaryStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-(--color-text-secondary) text-xs">{label}</span>
      <span className="text-(--color-text-primary) text-sm font-medium">{children}</span>
    </div>
  );
}
