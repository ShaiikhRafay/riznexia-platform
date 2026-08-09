import { describe, expect, it } from 'vitest';
import { deploymentStatusSchema } from './deployment-status';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('deploymentStatusSchema', () => {
  it('accepts a snapshot with no deployment or domain yet', () => {
    expect(
      deploymentStatusSchema.safeParse({
        generatedAt: new Date().toISOString(),
        leadId: UUID_A,
        latestDeployment: null,
        domain: null,
        productionReady: false,
      }).success,
    ).toBe(true);
  });

  it('accepts a snapshot with a completed, healthy deployment and a verified domain', () => {
    expect(
      deploymentStatusSchema.safeParse({
        generatedAt: new Date().toISOString(),
        leadId: UUID_A,
        latestDeployment: {
          id: UUID_A,
          businessId: UUID_A,
          generatedWebsiteId: UUID_A,
          generatedWebsiteVersion: 1,
          deploymentVersion: 1,
          provider: 'vercel',
          providerVersion: 'v1.0',
          providerDeploymentId: 'dpl_1',
          environment: 'production',
          commitHash: null,
          status: 'completed',
          healthStatus: 'healthy',
          liveUrl: 'https://example.vercel.app',
          errorMessage: null,
          deploymentHash: 'abc',
          deploymentEngineVersion: 'v1.0',
          rollbackFromDeploymentId: null,
          retryOfDeploymentId: null,
          buildStartedAt: new Date().toISOString(),
          buildCompletedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          executionDuration: 3000,
          createdById: null,
          createdAt: new Date().toISOString(),
        },
        domain: {
          id: UUID_A,
          businessId: UUID_A,
          hostname: 'example.com',
          type: 'custom',
          provider: 'vercel',
          verificationStatus: 'verified',
          verificationRecord: null,
          sslStatus: 'active',
          currentDeploymentId: UUID_A,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        productionReady: true,
      }).success,
    ).toBe(true);
  });
});
