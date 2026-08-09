import { describe, expect, it } from 'vitest';
import { createWebsiteDeploymentSchema, websiteDeploymentSchema } from './website-deployment';

const UUID_A = '11111111-1111-4111-8111-111111111111';

function validDeployment(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    businessId: UUID_A,
    generatedWebsiteId: UUID_A,
    generatedWebsiteVersion: 1,
    deploymentVersion: 1,
    provider: 'vercel',
    providerVersion: 'v1.0',
    providerDeploymentId: null,
    environment: 'production',
    commitHash: null,
    status: 'requested',
    healthStatus: 'unknown',
    liveUrl: null,
    errorMessage: null,
    deploymentHash: 'abc123',
    deploymentEngineVersion: 'v1.0',
    rollbackFromDeploymentId: null,
    retryOfDeploymentId: null,
    buildStartedAt: null,
    buildCompletedAt: null,
    completedAt: null,
    executionDuration: null,
    createdById: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('websiteDeploymentSchema', () => {
  it('accepts a freshly-requested deployment', () => {
    expect(websiteDeploymentSchema.safeParse(validDeployment()).success).toBe(true);
  });

  it('accepts a completed, healthy deployment with all lifecycle fields populated', () => {
    const result = websiteDeploymentSchema.safeParse(
      validDeployment({
        status: 'completed',
        healthStatus: 'healthy',
        liveUrl: 'https://example.vercel.app',
        providerDeploymentId: 'dpl_123',
        buildStartedAt: new Date().toISOString(),
        buildCompletedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        executionDuration: 4200,
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects an unknown provider', () => {
    expect(websiteDeploymentSchema.safeParse(validDeployment({ provider: 'heroku' })).success).toBe(
      false,
    );
  });

  it('rejects an unknown status', () => {
    expect(
      websiteDeploymentSchema.safeParse(validDeployment({ status: 'rolled_back' })).success,
    ).toBe(false);
  });

  it('rejects a non-positive deploymentVersion', () => {
    expect(
      websiteDeploymentSchema.safeParse(validDeployment({ deploymentVersion: 0 })).success,
    ).toBe(false);
  });
});

describe('createWebsiteDeploymentSchema', () => {
  it('accepts an empty body', () => {
    expect(createWebsiteDeploymentSchema.safeParse({}).success).toBe(true);
  });

  it('accepts an optional commitHash', () => {
    expect(createWebsiteDeploymentSchema.safeParse({ commitHash: 'a1b2c3d' }).success).toBe(true);
  });

  it('has no environment field — every deployment this phase is production, server-set', () => {
    const result = createWebsiteDeploymentSchema.safeParse({ environment: 'preview' });
    // Not `.strict()`, so the unknown key is silently stripped rather than rejected —
    // the point is that it can never reach the service layer, not that the request 400s.
    expect(result.success).toBe(true);
    expect(result.success && 'environment' in result.data).toBe(false);
  });
});
