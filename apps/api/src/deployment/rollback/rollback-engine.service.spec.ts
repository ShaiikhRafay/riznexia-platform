import type { PrismaClient } from '@riznexia/db';
import {
  InvalidRollbackTargetException,
  LeadNotFoundException,
  WebsiteDeploymentNotFoundException,
} from '../../common/exceptions/app.exception';
import type { LeadsService } from '../../leads/leads.service';
import type { DeploymentEngineService } from '../engine/deployment-engine.service';
import { RollbackEngineService } from './rollback-engine.service';

function fakeTargetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deployment-1',
    businessId: 'business-1',
    generatedWebsiteId: 'gw-1',
    status: 'COMPLETED',
    healthStatus: 'HEALTHY',
    commitHash: 'abc123',
    ...overrides,
  };
}

describe('RollbackEngineService', () => {
  let prisma: {
    websiteDeployment: { findUnique: jest.Mock };
    generatedWebsite: { findUniqueOrThrow: jest.Mock };
  };
  let leadsService: { findById: jest.Mock };
  let deploymentEngineService: { deployGeneratedWebsite: jest.Mock };
  let service: RollbackEngineService;

  beforeEach(() => {
    prisma = {
      websiteDeployment: { findUnique: jest.fn().mockResolvedValue(fakeTargetRow()) },
      generatedWebsite: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'gw-1', configVersion: 2 }),
      },
    };
    leadsService = { findById: jest.fn().mockResolvedValue({ businessId: 'business-1' }) };
    deploymentEngineService = { deployGeneratedWebsite: jest.fn() };
    service = new RollbackEngineService(
      prisma as unknown as PrismaClient,
      leadsService as unknown as LeadsService,
      deploymentEngineService as unknown as DeploymentEngineService,
    );
  });

  it('throws LeadNotFoundException for an unknown lead', async () => {
    leadsService.findById.mockResolvedValue(null);
    await expect(service.rollbackTo('missing', 'deployment-1', 'actor-1')).rejects.toBeInstanceOf(
      LeadNotFoundException,
    );
  });

  it('throws WebsiteDeploymentNotFoundException when the target belongs to a different business', async () => {
    prisma.websiteDeployment.findUnique.mockResolvedValue(
      fakeTargetRow({ businessId: 'other-business' }),
    );
    await expect(service.rollbackTo('lead-1', 'deployment-1', 'actor-1')).rejects.toBeInstanceOf(
      WebsiteDeploymentNotFoundException,
    );
  });

  it('throws InvalidRollbackTargetException when the target is not COMPLETED', async () => {
    prisma.websiteDeployment.findUnique.mockResolvedValue(fakeTargetRow({ status: 'FAILED' }));
    await expect(service.rollbackTo('lead-1', 'deployment-1', 'actor-1')).rejects.toBeInstanceOf(
      InvalidRollbackTargetException,
    );
    expect(deploymentEngineService.deployGeneratedWebsite).not.toHaveBeenCalled();
  });

  it('throws InvalidRollbackTargetException when the target is COMPLETED but not HEALTHY', async () => {
    prisma.websiteDeployment.findUnique.mockResolvedValue(
      fakeTargetRow({ healthStatus: 'UNHEALTHY' }),
    );
    await expect(service.rollbackTo('lead-1', 'deployment-1', 'actor-1')).rejects.toBeInstanceOf(
      InvalidRollbackTargetException,
    );
  });

  it('delegates to DeploymentEngineService.deployGeneratedWebsite with rollbackFromDeploymentId set, using the target historical GeneratedWebsite', async () => {
    deploymentEngineService.deployGeneratedWebsite.mockResolvedValue({
      id: 'deployment-2',
      status: 'completed',
    });

    const result = await service.rollbackTo('lead-1', 'deployment-1', 'actor-1');

    expect(prisma.generatedWebsite.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'gw-1' },
    });
    expect(deploymentEngineService.deployGeneratedWebsite).toHaveBeenCalledWith({
      leadId: 'lead-1',
      businessId: 'business-1',
      generatedWebsite: { id: 'gw-1', configVersion: 2 },
      actorId: 'actor-1',
      commitHash: 'abc123',
      rollbackFromDeploymentId: 'deployment-1',
    });
    expect(result.id).toBe('deployment-2');
  });

  it('does not throw when the resulting rollback deployment itself ends up failed — it just returns the failed row', async () => {
    deploymentEngineService.deployGeneratedWebsite.mockResolvedValue({
      id: 'deployment-2',
      status: 'failed',
    });
    const result = await service.rollbackTo('lead-1', 'deployment-1', 'actor-1');
    expect(result.status).toBe('failed');
  });
});
