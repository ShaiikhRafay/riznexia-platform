import type { WebsiteDeployment } from '@riznexia/shared-types';

// Deployment History / Details (F11): the founder's brief asks for a
// "Trigger Type" column, but no dedicated field exists on
// `WebsiteDeployment` — the backend instead expresses it through two real,
// mutually exclusive foreign keys, `rollbackFromDeploymentId` and
// `retryOfDeploymentId` (a row can carry at most one, since a rollback and
// a retry are two different reasons a *new* row gets created — never both
// on the same row). This derives a three-way label directly from those
// two already-returned fields; it never invents new information, only
// summarizes what the backend already returned under a friendlier name.
export type DeploymentTriggerType = 'manual' | 'retry' | 'rollback';

export function getTriggerType(
  deployment: Pick<WebsiteDeployment, 'rollbackFromDeploymentId' | 'retryOfDeploymentId'>,
): DeploymentTriggerType {
  if (deployment.rollbackFromDeploymentId) {
    return 'rollback';
  }
  if (deployment.retryOfDeploymentId) {
    return 'retry';
  }
  return 'manual';
}

export const TRIGGER_TYPE_LABELS: Record<DeploymentTriggerType, string> = {
  manual: 'Manual',
  retry: 'Retry',
  rollback: 'Rollback',
};
