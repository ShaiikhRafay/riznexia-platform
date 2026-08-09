import {
  DeploymentEnvironment as PrismaDeploymentEnvironment,
  DeploymentProviderName as PrismaDeploymentProviderName,
  DeploymentStatus as PrismaDeploymentStatus,
  HealthStatus as PrismaHealthStatus,
} from '@riznexia/db';
import type {
  DeploymentEnvironment,
  DeploymentProviderName,
  DeploymentStatus,
  HealthStatus,
} from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split as every other mapper in
// this codebase (leads/lead.mapper.ts, crm/tasks/crm-task.mapper.ts) —
// shared across every M11 engine (Deployment/Health/Rollback/Domain),
// not duplicated per engine.
const PRISMA_TO_API_PROVIDER: Record<PrismaDeploymentProviderName, DeploymentProviderName> = {
  [PrismaDeploymentProviderName.VERCEL]: 'vercel',
  [PrismaDeploymentProviderName.CLOUDFLARE_PAGES]: 'cloudflare_pages',
  [PrismaDeploymentProviderName.NETLIFY]: 'netlify',
  [PrismaDeploymentProviderName.AWS_AMPLIFY]: 'aws_amplify',
  [PrismaDeploymentProviderName.AZURE_STATIC_WEB_APPS]: 'azure_static_web_apps',
  [PrismaDeploymentProviderName.SELF_HOSTED]: 'self_hosted',
};
const API_TO_PRISMA_PROVIDER: Record<DeploymentProviderName, PrismaDeploymentProviderName> = {
  vercel: PrismaDeploymentProviderName.VERCEL,
  cloudflare_pages: PrismaDeploymentProviderName.CLOUDFLARE_PAGES,
  netlify: PrismaDeploymentProviderName.NETLIFY,
  aws_amplify: PrismaDeploymentProviderName.AWS_AMPLIFY,
  azure_static_web_apps: PrismaDeploymentProviderName.AZURE_STATIC_WEB_APPS,
  self_hosted: PrismaDeploymentProviderName.SELF_HOSTED,
};

const PRISMA_TO_API_ENVIRONMENT: Record<PrismaDeploymentEnvironment, DeploymentEnvironment> = {
  [PrismaDeploymentEnvironment.PRODUCTION]: 'production',
  [PrismaDeploymentEnvironment.PREVIEW]: 'preview',
};

const PRISMA_TO_API_STATUS: Record<PrismaDeploymentStatus, DeploymentStatus> = {
  [PrismaDeploymentStatus.REQUESTED]: 'requested',
  [PrismaDeploymentStatus.VALIDATING]: 'validating',
  [PrismaDeploymentStatus.IN_PROGRESS]: 'in_progress',
  [PrismaDeploymentStatus.COMPLETED]: 'completed',
  [PrismaDeploymentStatus.FAILED]: 'failed',
};

const PRISMA_TO_API_HEALTH: Record<PrismaHealthStatus, HealthStatus> = {
  [PrismaHealthStatus.UNKNOWN]: 'unknown',
  [PrismaHealthStatus.HEALTHY]: 'healthy',
  [PrismaHealthStatus.UNHEALTHY]: 'unhealthy',
};
const API_TO_PRISMA_HEALTH: Record<HealthStatus, PrismaHealthStatus> = {
  unknown: PrismaHealthStatus.UNKNOWN,
  healthy: PrismaHealthStatus.HEALTHY,
  unhealthy: PrismaHealthStatus.UNHEALTHY,
};

export function toApiProviderName(provider: PrismaDeploymentProviderName): DeploymentProviderName {
  return PRISMA_TO_API_PROVIDER[provider];
}

export function toPrismaProviderName(
  provider: DeploymentProviderName,
): PrismaDeploymentProviderName {
  return API_TO_PRISMA_PROVIDER[provider];
}

export function toApiEnvironment(environment: PrismaDeploymentEnvironment): DeploymentEnvironment {
  return PRISMA_TO_API_ENVIRONMENT[environment];
}

export function toApiDeploymentStatus(status: PrismaDeploymentStatus): DeploymentStatus {
  return PRISMA_TO_API_STATUS[status];
}

export function toApiHealthStatus(status: PrismaHealthStatus): HealthStatus {
  return PRISMA_TO_API_HEALTH[status];
}

export function toPrismaHealthStatus(status: HealthStatus): PrismaHealthStatus {
  return API_TO_PRISMA_HEALTH[status];
}
