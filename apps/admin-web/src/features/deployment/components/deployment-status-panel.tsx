'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Skeleton,
  StatusBadge,
  toast,
} from '@riznexia/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useCreateDeployment } from '../api/use-create-deployment';
import { useDeploymentStatus } from '../api/use-deployment-status';
import { formatDateTime } from '../format';
import {
  DEPLOYMENT_PROVIDER_LABELS,
  DEPLOYMENT_STATUS_PRESENTATION,
  HEALTH_STATUS_PRESENTATION,
} from '../status';

export interface DeploymentStatusPanelProps {
  leadId: string;
  businessName: string;
}

// Deployment Dashboard (F11): "Display exactly what the backend
// provides... Current Deployment, Deployment Status, Provider,
// Environment, Current Version, Deployment Time, Latest Health Status."
// Backed entirely by `GET /leads/:id/deployment-status`, a computed
// rollup the backend already produces — this panel never re-derives
// anything itself. "Allow deployment only if backend supports it" is
// realized as: the Deploy action is visible only under `deployment:create`
// (the real backend gate), and the real POST call's own errors
// (`GENERATED_WEBSITE_NOT_FOUND`/`DEPLOYMENT_VALIDATION_FAILED`) are
// surfaced verbatim via toast — never simulated or pre-validated here.
export function DeploymentStatusPanel({ leadId, businessName }: DeploymentStatusPanelProps) {
  const { data: snapshot, isLoading, error, refetch } = useDeploymentStatus(leadId);
  const createDeployment = useCreateDeployment(leadId);

  function handleDeploy() {
    createDeployment
      .mutateAsync({})
      .then(() => toast.success('Deployment requested'))
      .catch((mutationError: unknown) => {
        const message =
          mutationError instanceof ApiError
            ? mutationError.message
            : 'Could not request a deployment.';
        toast.error(message);
      });
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!snapshot) {
    return null;
  }

  const { latestDeployment, domain } = snapshot;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">{businessName}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/deployment/${leadId}/domains`}
            className="text-(--color-accent) text-sm font-medium hover:underline"
          >
            Domain Management
          </Link>
          <Link
            href={`/deployment/${leadId}/history`}
            className="text-(--color-accent) text-sm font-medium hover:underline"
          >
            Deployment History
          </Link>
          <PermissionGate permission="deployment:create">
            <Button size="sm" onClick={handleDeploy} loading={createDeployment.isPending}>
              Deploy
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Deployment</CardTitle>
        </CardHeader>
        <CardContent>
          {!latestDeployment ? (
            <p className="text-(--color-text-secondary) text-sm">
              No deployment has been requested for this lead yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <StatRow label="Deployment Status">
                <StatusBadge {...DEPLOYMENT_STATUS_PRESENTATION[latestDeployment.status]} />
              </StatRow>
              <StatRow label="Provider">
                {DEPLOYMENT_PROVIDER_LABELS[latestDeployment.provider]}
              </StatRow>
              <StatRow label="Environment">{latestDeployment.environment}</StatRow>
              <StatRow label="Current Version">{latestDeployment.deploymentVersion}</StatRow>
              <StatRow label="Deployment Time">
                {formatDateTime(latestDeployment.createdAt)}
              </StatRow>
              <StatRow label="Latest Health Status">
                <StatusBadge {...HEALTH_STATUS_PRESENTATION[latestDeployment.healthStatus]} />
              </StatRow>
              {latestDeployment.liveUrl ? (
                <StatRow label="Live URL">
                  <a
                    href={latestDeployment.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-(--color-accent) hover:underline"
                  >
                    {latestDeployment.liveUrl}
                  </a>
                </StatRow>
              ) : null}
              <StatRow label="Production Ready">{snapshot.productionReady ? 'Yes' : 'No'}</StatRow>
              <StatRow label="">
                <Link
                  href={`/deployment/${leadId}/deployments/${latestDeployment.id}`}
                  className="text-(--color-accent) hover:underline"
                >
                  View Details
                </Link>
              </StatRow>
            </div>
          )}
        </CardContent>
      </Card>

      {domain ? (
        <Card>
          <CardHeader>
            <CardTitle>Domain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatRow label="Hostname">{domain.hostname}</StatRow>
              <StatRow label="Verification Status">{domain.verificationStatus}</StatRow>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label ? <span className="text-(--color-text-secondary) text-xs">{label}</span> : null}
      <span className="text-(--color-text-primary) text-sm font-medium">{children}</span>
    </div>
  );
}
