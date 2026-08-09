import type { PrismaClient } from '@riznexia/db';
import { LeadNotFoundException } from '../../common/exceptions/app.exception';
import type { LeadsService } from '../../leads/leads.service';
import { DeploymentStatusService } from './deployment-status.service';

function fakeDeploymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deployment-1',
    businessId: 'business-1',
    generatedWebsiteId: 'gw-1',
    generatedWebsiteVersion: 1,
    deploymentVersion: 1,
    provider: 'VERCEL',
    providerVersion: 'v1.0',
    providerDeploymentId: 'dpl_1',
    environment: 'PRODUCTION',
    commitHash: null,
    status: 'COMPLETED',
    healthStatus: 'HEALTHY',
    liveUrl: 'https://x.vercel.app',
    errorMessage: null,
    deploymentHash: 'abc',
    deploymentEngineVersion: 'v1.0',
    rollbackFromDeploymentId: null,
    retryOfDeploymentId: null,
    buildStartedAt: null,
    buildCompletedAt: null,
    completedAt: null,
    executionDuration: null,
    createdById: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeDomainRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'domain-1',
    businessId: 'business-1',
    hostname: 'example.com',
    type: 'CUSTOM',
    provider: 'VERCEL',
    verificationStatus: 'VERIFIED',
    verificationRecord: null,
    sslStatus: 'ACTIVE',
    currentDeploymentId: 'deployment-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DeploymentStatusService', () => {
  let prisma: { websiteDeployment: { findFirst: jest.Mock }; domain: { findFirst: jest.Mock } };
  let leadsService: { findById: jest.Mock };
  let service: DeploymentStatusService;

  beforeEach(() => {
    prisma = {
      websiteDeployment: { findFirst: jest.fn().mockResolvedValue(null) },
      domain: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    leadsService = { findById: jest.fn().mockResolvedValue({ businessId: 'business-1' }) };
    service = new DeploymentStatusService(
      prisma as unknown as PrismaClient,
      leadsService as unknown as LeadsService,
    );
  });

  it('throws LeadNotFoundException for an unknown lead', async () => {
    leadsService.findById.mockResolvedValue(null);
    await expect(service.getForLead('missing')).rejects.toBeInstanceOf(LeadNotFoundException);
  });

  it('reports productionReady=false and null deployment/domain when nothing has been deployed yet', async () => {
    const result = await service.getForLead('lead-1');
    expect(result.latestDeployment).toBeNull();
    expect(result.domain).toBeNull();
    expect(result.productionReady).toBe(false);
  });

  it('reports productionReady=true when the latest deployment is COMPLETED and HEALTHY', async () => {
    prisma.websiteDeployment.findFirst.mockResolvedValue(fakeDeploymentRow());
    prisma.domain.findFirst.mockResolvedValue(fakeDomainRow());

    const result = await service.getForLead('lead-1');

    expect(result.productionReady).toBe(true);
    expect(result.latestDeployment?.status).toBe('completed');
    expect(result.domain?.hostname).toBe('example.com');
  });

  it('reports productionReady=false when the latest deployment is COMPLETED but not yet HEALTHY', async () => {
    prisma.websiteDeployment.findFirst.mockResolvedValue(
      fakeDeploymentRow({ healthStatus: 'UNKNOWN' }),
    );
    const result = await service.getForLead('lead-1');
    expect(result.productionReady).toBe(false);
  });

  it('reports productionReady=false when the latest deployment FAILED', async () => {
    prisma.websiteDeployment.findFirst.mockResolvedValue(
      fakeDeploymentRow({ status: 'FAILED', healthStatus: 'UNKNOWN' }),
    );
    const result = await service.getForLead('lead-1');
    expect(result.productionReady).toBe(false);
  });
});
