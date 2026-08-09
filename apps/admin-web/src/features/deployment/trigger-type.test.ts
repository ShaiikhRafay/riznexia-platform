import { describe, expect, it } from 'vitest';
import { getTriggerType } from './trigger-type';

describe('getTriggerType', () => {
  it('returns "rollback" when rollbackFromDeploymentId is set', () => {
    expect(
      getTriggerType({ rollbackFromDeploymentId: 'deployment-1', retryOfDeploymentId: null }),
    ).toBe('rollback');
  });

  it('returns "retry" when retryOfDeploymentId is set and rollbackFromDeploymentId is not', () => {
    expect(
      getTriggerType({ rollbackFromDeploymentId: null, retryOfDeploymentId: 'deployment-1' }),
    ).toBe('retry');
  });

  it('returns "manual" when neither is set', () => {
    expect(getTriggerType({ rollbackFromDeploymentId: null, retryOfDeploymentId: null })).toBe(
      'manual',
    );
  });

  it('prefers "rollback" if both were somehow set, since a rollback is the more specific action', () => {
    expect(
      getTriggerType({
        rollbackFromDeploymentId: 'deployment-1',
        retryOfDeploymentId: 'deployment-2',
      }),
    ).toBe('rollback');
  });
});
