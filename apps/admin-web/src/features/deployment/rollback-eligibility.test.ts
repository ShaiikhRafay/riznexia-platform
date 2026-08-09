import { describe, expect, it } from 'vitest';
import { isRollbackEligible } from './rollback-eligibility';

describe('isRollbackEligible', () => {
  it('is eligible only when completed and healthy', () => {
    expect(isRollbackEligible({ status: 'completed', healthStatus: 'healthy' })).toBe(true);
  });

  it('is not eligible when completed but unhealthy', () => {
    expect(isRollbackEligible({ status: 'completed', healthStatus: 'unhealthy' })).toBe(false);
  });

  it('is not eligible when healthy but not completed', () => {
    expect(isRollbackEligible({ status: 'in_progress', healthStatus: 'healthy' })).toBe(false);
  });

  it('is not eligible when failed', () => {
    expect(isRollbackEligible({ status: 'failed', healthStatus: 'unknown' })).toBe(false);
  });
});
