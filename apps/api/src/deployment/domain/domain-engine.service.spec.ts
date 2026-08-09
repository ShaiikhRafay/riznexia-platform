import type { PrismaClient } from '@riznexia/db';
import {
  DomainNotFoundException,
  LeadNotFoundException,
} from '../../common/exceptions/app.exception';
import type { LeadsService } from '../../leads/leads.service';
import type { DeploymentProvider } from '../provider/deployment-provider.interface';
import { DomainEngineService } from './domain-engine.service';

function fakeDeploymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deployment-1',
    businessId: 'business-1',
    status: 'COMPLETED',
    providerDeploymentId: 'dpl_1',
    deploymentVersion: 3,
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
    verificationStatus: 'PENDING',
    verificationRecord: null,
    sslStatus: 'PENDING',
    currentDeploymentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DomainEngineService', () => {
  let prisma: {
    domain: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    websiteDeployment: { findFirst: jest.Mock; findUnique: jest.Mock };
  };
  let deploymentProvider: { name: string; attachDomain?: jest.Mock };
  let leadsService: { findById: jest.Mock };
  let service: DomainEngineService;

  beforeEach(() => {
    prisma = {
      domain: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      websiteDeployment: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn() },
    };
    deploymentProvider = { name: 'vercel', attachDomain: jest.fn() };
    leadsService = { findById: jest.fn().mockResolvedValue({ businessId: 'business-1' }) };
    service = new DomainEngineService(
      prisma as unknown as PrismaClient,
      deploymentProvider as unknown as DeploymentProvider,
      leadsService as unknown as LeadsService,
    );
  });

  describe('listForLead', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.listForLead('missing')).rejects.toBeInstanceOf(LeadNotFoundException);
    });

    it('returns every domain for the business, oldest first', async () => {
      prisma.domain.findMany.mockResolvedValue([fakeDomainRow()]);
      const result = await service.listForLead('lead-1');
      expect(result).toHaveLength(1);
      expect(prisma.domain.findMany).toHaveBeenCalledWith({
        where: { businessId: 'business-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findByIdOrThrow', () => {
    it('throws DomainNotFoundException when the domain belongs to a different business', async () => {
      prisma.domain.findUnique.mockResolvedValue(fakeDomainRow({ businessId: 'other-business' }));
      await expect(service.findByIdOrThrow('lead-1', 'domain-1')).rejects.toBeInstanceOf(
        DomainNotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a PENDING domain with no currentDeploymentId when the business has no completed deployment yet', async () => {
      prisma.domain.create.mockResolvedValue(fakeDomainRow());
      const result = await service.create('lead-1', { hostname: 'example.com', type: 'custom' });

      expect(prisma.domain.create).toHaveBeenCalledWith({
        data: {
          businessId: 'business-1',
          hostname: 'example.com',
          type: 'CUSTOM',
          provider: 'VERCEL',
          currentDeploymentId: null,
        },
      });
      expect(deploymentProvider.attachDomain).not.toHaveBeenCalled();
      expect(result.verificationStatus).toBe('pending');
    });

    it('links currentDeploymentId to the latest completed deployment and attempts provider verification', async () => {
      prisma.websiteDeployment.findFirst.mockResolvedValue(fakeDeploymentRow());
      prisma.domain.create.mockResolvedValue(
        fakeDomainRow({ currentDeploymentId: 'deployment-1' }),
      );
      deploymentProvider.attachDomain!.mockResolvedValue({
        verified: false,
        verificationRecord: { verification: [] },
      });
      prisma.domain.update.mockResolvedValue(
        fakeDomainRow({ currentDeploymentId: 'deployment-1', verificationStatus: 'PENDING' }),
      );

      await service.create('lead-1', { hostname: 'example.com', type: 'custom' });

      expect(prisma.domain.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentDeploymentId: 'deployment-1' }),
        }),
      );
      expect(deploymentProvider.attachDomain).toHaveBeenCalledWith('dpl_1', 'example.com');
    });

    it('marks the domain VERIFIED and ACTIVE ssl when the provider reports it verified immediately', async () => {
      prisma.websiteDeployment.findFirst.mockResolvedValue(fakeDeploymentRow());
      prisma.domain.create.mockResolvedValue(
        fakeDomainRow({ currentDeploymentId: 'deployment-1' }),
      );
      deploymentProvider.attachDomain!.mockResolvedValue({
        verified: true,
        verificationRecord: null,
      });
      prisma.domain.update.mockResolvedValue(
        fakeDomainRow({ verificationStatus: 'VERIFIED', sslStatus: 'ACTIVE' }),
      );

      const result = await service.create('lead-1', { hostname: 'example.com', type: 'custom' });

      expect(prisma.domain.update).toHaveBeenCalledWith({
        where: { id: 'domain-1' },
        data: {
          verificationStatus: 'VERIFIED',
          verificationRecord: expect.anything(),
          sslStatus: 'ACTIVE',
        },
      });
      expect(result.verificationStatus).toBe('verified');
      expect(result.sslStatus).toBe('active');
    });

    it('does not fail domain creation when the provider verification attempt throws', async () => {
      prisma.websiteDeployment.findFirst.mockResolvedValue(fakeDeploymentRow());
      prisma.domain.create.mockResolvedValue(
        fakeDomainRow({ currentDeploymentId: 'deployment-1' }),
      );
      deploymentProvider.attachDomain!.mockRejectedValue(new Error('Vercel: HTTP 500'));
      prisma.domain.findUniqueOrThrow.mockResolvedValue(
        fakeDomainRow({ currentDeploymentId: 'deployment-1' }),
      );

      const result = await service.create('lead-1', { hostname: 'example.com', type: 'custom' });

      expect(result.id).toBe('domain-1');
      expect(prisma.domain.update).not.toHaveBeenCalled();
    });

    it('skips provider verification entirely when the active provider has no attachDomain method', async () => {
      deploymentProvider.attachDomain = undefined;
      prisma.websiteDeployment.findFirst.mockResolvedValue(fakeDeploymentRow());
      prisma.domain.create.mockResolvedValue(
        fakeDomainRow({ currentDeploymentId: 'deployment-1' }),
      );
      prisma.domain.findUniqueOrThrow.mockResolvedValue(
        fakeDomainRow({ currentDeploymentId: 'deployment-1' }),
      );

      const result = await service.create('lead-1', { hostname: 'example.com', type: 'custom' });

      expect(result.id).toBe('domain-1');
    });
  });

  describe('verify', () => {
    it('returns the domain unchanged when it has no currentDeploymentId yet', async () => {
      prisma.domain.findUnique.mockResolvedValue(fakeDomainRow({ currentDeploymentId: null }));
      const result = await service.verify('lead-1', 'domain-1');
      expect(result.verificationStatus).toBe('pending');
      expect(deploymentProvider.attachDomain).not.toHaveBeenCalled();
    });

    it('re-attempts provider verification when a currentDeploymentId exists', async () => {
      prisma.domain.findUnique.mockResolvedValue(
        fakeDomainRow({ currentDeploymentId: 'deployment-1' }),
      );
      prisma.websiteDeployment.findUnique.mockResolvedValue(fakeDeploymentRow());
      deploymentProvider.attachDomain!.mockResolvedValue({
        verified: true,
        verificationRecord: null,
      });
      prisma.domain.update.mockResolvedValue(
        fakeDomainRow({ verificationStatus: 'VERIFIED', sslStatus: 'ACTIVE' }),
      );

      const result = await service.verify('lead-1', 'domain-1');

      expect(deploymentProvider.attachDomain).toHaveBeenCalledWith('dpl_1', 'example.com');
      expect(result.verificationStatus).toBe('verified');
    });
  });
});
