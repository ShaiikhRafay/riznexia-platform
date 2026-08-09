import type { DeploymentHealthCheck as DeploymentHealthCheckModel } from '@riznexia/db';
import type { DeploymentHealthCheck } from '@riznexia/shared-types';
import { toApiHealthStatus } from '../../deployment.mapper';

export function toDeploymentHealthCheckResponse(
  check: DeploymentHealthCheckModel,
): DeploymentHealthCheck {
  return {
    id: check.id,
    deploymentId: check.deploymentId,
    status: toApiHealthStatus(check.status),
    checkedAt: check.checkedAt.toISOString(),
    responseTimeMs: check.responseTimeMs,
    httpStatusCode: check.httpStatusCode,
    detail: check.detail as Record<string, unknown> | null,
  };
}
