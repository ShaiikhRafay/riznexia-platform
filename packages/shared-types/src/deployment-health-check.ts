import { z } from 'zod';
import { HEALTH_STATUSES } from './website-deployment';

// Module M11 (DECISIONS.md D-095) — Health Check Engine. One row per
// check *run*, not folded into WebsiteDeployment — a deployment can be
// checked repeatedly over its lifetime.
export const deploymentHealthCheckSchema = z.object({
  id: z.string().uuid(),
  deploymentId: z.string().uuid(),
  status: z.enum(HEALTH_STATUSES),
  checkedAt: z.string().datetime(),
  responseTimeMs: z.number().int().nonnegative().nullable(),
  httpStatusCode: z.number().int().nullable(),
  // Which specific checks ran and their individual pass/fail — same
  // self-explaining-not-a-bare-verdict discipline as
  // PublishReadinessReport's ScoreBreakdown.deductions.
  detail: z.record(z.unknown()).nullable(),
});
export type DeploymentHealthCheck = z.infer<typeof deploymentHealthCheckSchema>;

export const listDeploymentHealthChecksQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListDeploymentHealthChecksQuery = z.infer<typeof listDeploymentHealthChecksQuerySchema>;
