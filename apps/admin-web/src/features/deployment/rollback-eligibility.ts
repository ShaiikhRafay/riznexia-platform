import type { WebsiteDeployment } from '@riznexia/shared-types';

// Deployment Details (F11): "Rollback Availability" — no dedicated field
// exists for an arbitrary historical deployment (unlike
// `DeploymentStatusSnapshot.productionReady`, which the backend
// precomputes only for the *latest* deployment). This mirrors the exact
// rule stated in the backend's own `rollback-engine.controller.ts` comment
// ("must be a previous COMPLETED + HEALTHY one") and enforced server-side
// as `INVALID_ROLLBACK_TARGET` — a plain boolean read off two fields
// already displayed on this page, never a computed score.
export function isRollbackEligible(
  deployment: Pick<WebsiteDeployment, 'status' | 'healthStatus'>,
): boolean {
  return deployment.status === 'completed' && deployment.healthStatus === 'healthy';
}
