import type { WebsiteDeployment as WebsiteDeploymentModel } from '@riznexia/db';
import type { WebsiteDeployment } from '@riznexia/shared-types';
import {
  toApiDeploymentStatus,
  toApiEnvironment,
  toApiHealthStatus,
  toApiProviderName,
} from '../../deployment.mapper';

export function toWebsiteDeploymentResponse(deployment: WebsiteDeploymentModel): WebsiteDeployment {
  return {
    id: deployment.id,
    businessId: deployment.businessId,
    generatedWebsiteId: deployment.generatedWebsiteId,
    generatedWebsiteVersion: deployment.generatedWebsiteVersion,
    deploymentVersion: deployment.deploymentVersion,
    provider: toApiProviderName(deployment.provider),
    providerVersion: deployment.providerVersion,
    providerDeploymentId: deployment.providerDeploymentId,
    environment: toApiEnvironment(deployment.environment),
    commitHash: deployment.commitHash,
    status: toApiDeploymentStatus(deployment.status),
    healthStatus: toApiHealthStatus(deployment.healthStatus),
    liveUrl: deployment.liveUrl,
    errorMessage: deployment.errorMessage,
    deploymentHash: deployment.deploymentHash,
    deploymentEngineVersion: deployment.deploymentEngineVersion,
    rollbackFromDeploymentId: deployment.rollbackFromDeploymentId,
    retryOfDeploymentId: deployment.retryOfDeploymentId,
    buildStartedAt: deployment.buildStartedAt?.toISOString() ?? null,
    buildCompletedAt: deployment.buildCompletedAt?.toISOString() ?? null,
    completedAt: deployment.completedAt?.toISOString() ?? null,
    executionDuration: deployment.executionDuration,
    createdById: deployment.createdById,
    createdAt: deployment.createdAt.toISOString(),
  };
}
