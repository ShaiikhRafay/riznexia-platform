'use client';

import { Button, ErrorState, Skeleton, StatusBadge, toast } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useDeployment } from '../api/use-deployment';
import { useRetryDeployment } from '../api/use-retry-deployment';
import { useRollbackDeployment } from '../api/use-rollback-deployment';
import { DetailCard, FieldRow } from './detail-primitives';
import { formatDateTime, formatDurationMs } from '../format';
import { isRollbackEligible } from '../rollback-eligibility';
import {
  DEPLOYMENT_PROVIDER_LABELS,
  DEPLOYMENT_STATUS_PRESENTATION,
  HEALTH_STATUS_PRESENTATION,
} from '../status';
import { TRIGGER_TYPE_LABELS, getTriggerType } from '../trigger-type';

export interface DeploymentDetailsPageProps {
  leadId: string;
  deploymentId: string;
}

// Deployment Details (F11): "Display every field returned by backend" —
// every field of `WebsiteDeployment` appears exactly once across the five
// cards below; none is invented. "Deployment Logs (if available)" is
// answered honestly: `WebsiteDeployment` has no log-text field anywhere
// (verified against `website-deployment.ts`), so that card states the
// fact rather than being silently omitted or faked.
export function DeploymentDetailsPage({ leadId, deploymentId }: DeploymentDetailsPageProps) {
  const { data: deployment, isLoading, error, refetch } = useDeployment(leadId, deploymentId);
  const retryDeployment = useRetryDeployment(leadId, deploymentId);
  const rollbackDeployment = useRollbackDeployment(leadId, deploymentId);

  function handleRetry() {
    retryDeployment
      .mutateAsync()
      .then((newDeployment) =>
        toast.success(`Retry requested — new deployment v${newDeployment.deploymentVersion}`),
      )
      .catch((mutationError: unknown) => {
        const message =
          mutationError instanceof ApiError
            ? mutationError.message
            : 'Could not retry this deployment.';
        toast.error(message);
      });
  }

  function handleRollback() {
    rollbackDeployment
      .mutateAsync()
      .then((newDeployment) =>
        toast.success(`Rollback requested — new deployment v${newDeployment.deploymentVersion}`),
      )
      .catch((mutationError: unknown) => {
        const message =
          mutationError instanceof ApiError
            ? mutationError.message
            : 'Could not roll back to this deployment.';
        toast.error(message);
      });
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/deployment/${leadId}/history`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Deployment History
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !deployment ? null : (
        <>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-h1 text-(--color-text-primary) font-semibold">
              Deployment v{deployment.deploymentVersion}
            </h1>
            <div className="flex items-center gap-2">
              {deployment.status === 'failed' ? (
                <PermissionGate permission="deployment:create">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleRetry}
                    loading={retryDeployment.isPending}
                  >
                    Retry
                  </Button>
                </PermissionGate>
              ) : null}
              <PermissionGate permission="deployment:rollback">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRollback}
                  loading={rollbackDeployment.isPending}
                  disabled={!isRollbackEligible(deployment)}
                >
                  Roll Back to This Deployment
                </Button>
              </PermissionGate>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/deployment/${leadId}/deployments/${deploymentId}/health`}>
                  Health Monitoring
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard title="Deployment Information">
              <FieldRow label="ID">{deployment.id}</FieldRow>
              <FieldRow label="Version">{deployment.deploymentVersion}</FieldRow>
              <FieldRow label="Provider">
                {DEPLOYMENT_PROVIDER_LABELS[deployment.provider]}
              </FieldRow>
              <FieldRow label="Provider Version">{deployment.providerVersion}</FieldRow>
              <FieldRow label="Provider Deployment ID">
                {deployment.providerDeploymentId ?? '—'}
              </FieldRow>
              <FieldRow label="Environment">{deployment.environment}</FieldRow>
              <FieldRow label="Status">
                <StatusBadge {...DEPLOYMENT_STATUS_PRESENTATION[deployment.status]} />
              </FieldRow>
              <FieldRow label="Health Status">
                <StatusBadge {...HEALTH_STATUS_PRESENTATION[deployment.healthStatus]} />
              </FieldRow>
              <FieldRow label="Trigger Type">
                {TRIGGER_TYPE_LABELS[getTriggerType(deployment)]}
              </FieldRow>
              <FieldRow label="Live URL">
                {deployment.liveUrl ? (
                  <a
                    href={deployment.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-(--color-accent) hover:underline"
                  >
                    {deployment.liveUrl}
                  </a>
                ) : (
                  '—'
                )}
              </FieldRow>
              <FieldRow label="Error Message">{deployment.errorMessage ?? '—'}</FieldRow>
              <FieldRow label="Requested At">{formatDateTime(deployment.createdAt)}</FieldRow>
              <FieldRow label="Created By">{deployment.createdById ?? '—'}</FieldRow>
            </DetailCard>

            <DetailCard title="Build Information">
              <FieldRow label="Build Started">{formatDateTime(deployment.buildStartedAt)}</FieldRow>
              <FieldRow label="Build Completed">
                {formatDateTime(deployment.buildCompletedAt)}
              </FieldRow>
              <FieldRow label="Finished">{formatDateTime(deployment.completedAt)}</FieldRow>
              <FieldRow label="Duration">{formatDurationMs(deployment.executionDuration)}</FieldRow>
            </DetailCard>

            <DetailCard title="Commit Information">
              <FieldRow label="Commit Hash">
                {deployment.commitHash ?? 'No commit hash recorded for this deployment.'}
              </FieldRow>
            </DetailCard>

            <DetailCard title="Deployment Logs">
              <p className="text-(--color-text-secondary) text-sm">
                The backend does not return deployment log text for this resource.
              </p>
            </DetailCard>

            <DetailCard title="Deployment Metadata">
              <FieldRow label="Generated Website ID">{deployment.generatedWebsiteId}</FieldRow>
              <FieldRow label="Generated Website Version">
                {deployment.generatedWebsiteVersion}
              </FieldRow>
              <FieldRow label="Deployment Hash">{deployment.deploymentHash}</FieldRow>
              <FieldRow label="Deployment Engine Version">
                {deployment.deploymentEngineVersion}
              </FieldRow>
              <FieldRow label="Business ID">{deployment.businessId}</FieldRow>
              {deployment.retryOfDeploymentId ? (
                <FieldRow label="Retry Of">
                  <Link
                    href={`/deployment/${leadId}/deployments/${deployment.retryOfDeploymentId}`}
                    className="text-(--color-accent) hover:underline"
                  >
                    {deployment.retryOfDeploymentId}
                  </Link>
                </FieldRow>
              ) : null}
              {deployment.rollbackFromDeploymentId ? (
                <FieldRow label="Rollback From">
                  <Link
                    href={`/deployment/${leadId}/deployments/${deployment.rollbackFromDeploymentId}`}
                    className="text-(--color-accent) hover:underline"
                  >
                    {deployment.rollbackFromDeploymentId}
                  </Link>
                </FieldRow>
              ) : null}
            </DetailCard>

            <DetailCard title="Rollback Availability">
              <FieldRow label="Available">
                <StatusBadge
                  variant={isRollbackEligible(deployment) ? 'success' : 'neutral'}
                  label={isRollbackEligible(deployment) ? 'Available' : 'Not Available'}
                />
              </FieldRow>
              <p className="text-(--color-text-secondary) text-xs">
                A deployment can only be rolled back to once it is Completed and Healthy.
              </p>
            </DetailCard>
          </div>
        </>
      )}
    </div>
  );
}
