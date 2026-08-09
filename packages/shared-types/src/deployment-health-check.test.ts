import { describe, expect, it } from 'vitest';
import { deploymentHealthCheckSchema } from './deployment-health-check';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('deploymentHealthCheckSchema', () => {
  it('accepts a healthy check with response detail', () => {
    expect(
      deploymentHealthCheckSchema.safeParse({
        id: UUID_A,
        deploymentId: UUID_A,
        status: 'healthy',
        checkedAt: new Date().toISOString(),
        responseTimeMs: 120,
        httpStatusCode: 200,
        detail: { checks: [{ name: 'http_200', passed: true }] },
      }).success,
    ).toBe(true);
  });

  it('accepts an unhealthy check with null response fields (e.g. connection refused)', () => {
    expect(
      deploymentHealthCheckSchema.safeParse({
        id: UUID_A,
        deploymentId: UUID_A,
        status: 'unhealthy',
        checkedAt: new Date().toISOString(),
        responseTimeMs: null,
        httpStatusCode: null,
        detail: null,
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(
      deploymentHealthCheckSchema.safeParse({
        id: UUID_A,
        deploymentId: UUID_A,
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        responseTimeMs: null,
        httpStatusCode: null,
        detail: null,
      }).success,
    ).toBe(false);
  });
});
