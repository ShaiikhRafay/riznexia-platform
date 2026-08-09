import { z } from 'zod';
import { deploymentProviderNameSchema, DEPLOYMENT_ENVIRONMENTS } from './deployment-provider';

// Module M11 (DECISIONS.md D-094) — the deployment pipeline itself.
// Deliberately no `rolled_back` value: a rollback never mutates a
// historical row's status — that fact lives on the *new* row's
// `rollbackFromDeploymentId` instead.
export const DEPLOYMENT_STATUSES = [
  'requested',
  'validating',
  'in_progress',
  'completed',
  'failed',
] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

// Module M11 (DECISIONS.md D-095) — orthogonal to DeploymentStatus.
// "Production Ready" = `status === 'completed' && healthStatus === 'healthy'`,
// not its own status value.
export const HEALTH_STATUSES = ['unknown', 'healthy', 'unhealthy'] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

// Module M11 — each row is one immutable deployment event (founder's
// explicit Decision 3). `rollbackFromDeploymentId`/`retryOfDeploymentId`
// point backward from a *new* row rather than any field ever being
// mutated onto a historical one.
export const websiteDeploymentSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  generatedWebsiteId: z.string().uuid(),
  generatedWebsiteVersion: z.number().int().positive(),
  deploymentVersion: z.number().int().positive(),
  provider: deploymentProviderNameSchema,
  providerVersion: z.string().min(1),
  providerDeploymentId: z.string().nullable(),
  environment: z.enum(DEPLOYMENT_ENVIRONMENTS),
  commitHash: z.string().nullable(),
  status: z.enum(DEPLOYMENT_STATUSES),
  healthStatus: z.enum(HEALTH_STATUSES),
  liveUrl: z.string().nullable(),
  errorMessage: z.string().nullable(),
  deploymentHash: z.string().min(1),
  deploymentEngineVersion: z.string().min(1),
  rollbackFromDeploymentId: z.string().uuid().nullable(),
  retryOfDeploymentId: z.string().uuid().nullable(),
  buildStartedAt: z.string().datetime().nullable(),
  buildCompletedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  executionDuration: z.number().int().nonnegative().nullable(),
  createdById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type WebsiteDeployment = z.infer<typeof websiteDeploymentSchema>;

export const COMMIT_HASH_MAX_LENGTH = 64;

// `environment` is deliberately not a field here — every deployment
// requested through this endpoint is `production` this phase (server-set,
// never client-supplied); see DEPLOYMENT_ENVIRONMENTS's own comment.
export const createWebsiteDeploymentSchema = z.object({
  commitHash: z.string().trim().min(1).max(COMMIT_HASH_MAX_LENGTH).optional(),
});
export type CreateWebsiteDeploymentInput = z.infer<typeof createWebsiteDeploymentSchema>;

export const listWebsiteDeploymentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListWebsiteDeploymentsQuery = z.infer<typeof listWebsiteDeploymentsQuerySchema>;
