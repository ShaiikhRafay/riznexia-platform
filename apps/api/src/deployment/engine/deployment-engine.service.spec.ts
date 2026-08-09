import type { PrismaClient } from '@riznexia/db';
import {
  DeploymentNotRetryableException,
  DeploymentProviderUnavailableException,
  DeploymentValidationFailedException,
  GeneratedWebsiteNotFoundException,
  LeadNotFoundException,
  WebsiteDeploymentNotFoundException,
} from '../../common/exceptions/app.exception';
import type { LeadsService } from '../../leads/leads.service';
import type { WebsitePreviewService } from '../../website-preview/website-preview.service';
import type { DeploymentProvider } from '../provider/deployment-provider.interface';
import type { HealthCheckEngineService } from '../health/health-check-engine.service';
import { DeploymentEngineService } from './deployment-engine.service';

function fakeGeneratedWebsite(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gw-1',
    businessId: 'business-1',
    configVersion: 3,
    files: [{ path: 'package.json', content: '{}' }],
    ...overrides,
  };
}

function fakeDeploymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deployment-1',
    businessId: 'business-1',
    generatedWebsiteId: 'gw-1',
    generatedWebsiteVersion: 3,
    deploymentVersion: 1,
    provider: 'VERCEL',
    providerVersion: 'v1.0',
    providerDeploymentId: null,
    environment: 'PRODUCTION',
    status: 'REQUESTED',
    healthStatus: 'UNKNOWN',
    commitHash: null,
    liveUrl: null,
    errorMessage: null,
    deploymentHash: 'abc',
    deploymentEngineVersion: 'v1.0',
    rollbackFromDeploymentId: null,
    retryOfDeploymentId: null,
    buildStartedAt: null,
    buildCompletedAt: null,
    completedAt: null,
    executionDuration: null,
    createdById: 'actor-1',
    createdAt: new Date(),
    ...overrides,
  };
}

function passingReport() {
  return {
    rules: [
      {
        ruleId: 'r1',
        ruleCategory: 'structural',
        ruleName: 'x',
        severity: 'low',
        status: 'pass',
        message: 'ok',
        recommendation: null,
        documentationUrl: null,
      },
    ],
  };
}

function failingReport() {
  return {
    rules: [
      {
        ruleId: 'r1',
        ruleCategory: 'seo',
        ruleName: 'x',
        severity: 'high',
        status: 'error',
        message: 'Missing title',
        recommendation: null,
        documentationUrl: null,
      },
    ],
  };
}

describe('DeploymentEngineService', () => {
  let prisma: {
    websiteDeployment: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    generatedWebsite: { findFirst: jest.Mock; findUniqueOrThrow: jest.Mock };
    business: { findUniqueOrThrow: jest.Mock };
  };
  let deploymentProvider: {
    name: string;
    version: string;
    isConfigured: jest.Mock;
    deploy: jest.Mock;
    getStatus: jest.Mock;
  };
  let leadsService: { findById: jest.Mock };
  let websitePreviewService: { getValidationReport: jest.Mock };
  let healthCheckEngineService: { runCheck: jest.Mock };
  let service: DeploymentEngineService;

  beforeEach(() => {
    prisma = {
      websiteDeployment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      generatedWebsite: {
        findFirst: jest.fn().mockResolvedValue(fakeGeneratedWebsite()),
        findUniqueOrThrow: jest.fn().mockResolvedValue(fakeGeneratedWebsite()),
      },
      business: { findUniqueOrThrow: jest.fn().mockResolvedValue({ businessName: "Joe's Diner" }) },
    };
    deploymentProvider = {
      name: 'vercel',
      version: 'v1.0',
      isConfigured: jest.fn().mockReturnValue(true),
      deploy: jest.fn(),
      getStatus: jest.fn(),
    };
    leadsService = { findById: jest.fn().mockResolvedValue({ businessId: 'business-1' }) };
    websitePreviewService = { getValidationReport: jest.fn().mockResolvedValue(passingReport()) };
    healthCheckEngineService = { runCheck: jest.fn().mockResolvedValue(undefined) };

    service = new DeploymentEngineService(
      prisma as unknown as PrismaClient,
      deploymentProvider as unknown as DeploymentProvider,
      leadsService as unknown as LeadsService,
      websitePreviewService as unknown as WebsitePreviewService,
      healthCheckEngineService as unknown as HealthCheckEngineService,
    );
  });

  describe('requestDeployment', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.requestDeployment('missing', {}, 'actor-1')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('throws GeneratedWebsiteNotFoundException when no website has been assembled yet', async () => {
      prisma.generatedWebsite.findFirst.mockResolvedValue(null);
      await expect(service.requestDeployment('lead-1', {}, 'actor-1')).rejects.toBeInstanceOf(
        GeneratedWebsiteNotFoundException,
      );
    });

    it('throws DeploymentProviderUnavailableException when the provider has no credentials configured', async () => {
      deploymentProvider.isConfigured.mockReturnValue(false);
      await expect(service.requestDeployment('lead-1', {}, 'actor-1')).rejects.toBeInstanceOf(
        DeploymentProviderUnavailableException,
      );
      expect(websitePreviewService.getValidationReport).not.toHaveBeenCalled();
    });

    it('throws DeploymentValidationFailedException with the failed rules when the site has not passed publish-readiness', async () => {
      websitePreviewService.getValidationReport.mockResolvedValue(failingReport());
      await expect(service.requestDeployment('lead-1', {}, 'actor-1')).rejects.toBeInstanceOf(
        DeploymentValidationFailedException,
      );
      expect(prisma.websiteDeployment.create).not.toHaveBeenCalled();
    });

    it('creates a REQUESTED row, transitions to IN_PROGRESS, then COMPLETED on a successful provider deploy, and runs a health check', async () => {
      prisma.websiteDeployment.create.mockResolvedValue(fakeDeploymentRow());
      prisma.websiteDeployment.update.mockResolvedValue(
        fakeDeploymentRow({ status: 'COMPLETED', liveUrl: 'https://joes-diner.vercel.app' }),
      );
      prisma.websiteDeployment.findUniqueOrThrow.mockResolvedValue(
        fakeDeploymentRow({ status: 'COMPLETED', healthStatus: 'HEALTHY' }),
      );
      deploymentProvider.deploy.mockResolvedValue({
        providerDeploymentId: 'dpl_1',
        liveUrl: 'https://joes-diner.vercel.app',
      });

      const result = await service.requestDeployment('lead-1', { commitHash: 'abc123' }, 'actor-1');

      expect(prisma.websiteDeployment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: 'business-1',
          generatedWebsiteId: 'gw-1',
          generatedWebsiteVersion: 3,
          deploymentVersion: 1,
          provider: 'VERCEL',
          providerVersion: 'v1.0',
          environment: 'PRODUCTION',
          commitHash: 'abc123',
          status: 'REQUESTED',
          createdById: 'actor-1',
        }),
      });
      expect(deploymentProvider.deploy).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [{ path: 'package.json', content: '{}' }],
          environment: 'production',
        }),
      );
      expect(healthCheckEngineService.runCheck).toHaveBeenCalledWith(
        'deployment-1',
        'https://joes-diner.vercel.app',
      );
      expect(result.id).toBe('deployment-1');
    });

    it('computes the next deploymentVersion as max existing + 1 for this business', async () => {
      prisma.websiteDeployment.findFirst.mockResolvedValue({ deploymentVersion: 4 });
      prisma.websiteDeployment.create.mockResolvedValue(
        fakeDeploymentRow({ deploymentVersion: 5 }),
      );
      prisma.websiteDeployment.update.mockResolvedValue(
        fakeDeploymentRow({ deploymentVersion: 5, status: 'COMPLETED' }),
      );
      prisma.websiteDeployment.findUniqueOrThrow.mockResolvedValue(
        fakeDeploymentRow({ deploymentVersion: 5, status: 'COMPLETED' }),
      );
      deploymentProvider.deploy.mockResolvedValue({
        providerDeploymentId: 'dpl_1',
        liveUrl: 'https://x.vercel.app',
      });

      await service.requestDeployment('lead-1', {}, 'actor-1');

      expect(prisma.websiteDeployment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deploymentVersion: 5 }) }),
      );
    });

    it('marks the deployment FAILED (and returns it, not throws) when the provider call rejects', async () => {
      prisma.websiteDeployment.create.mockResolvedValue(fakeDeploymentRow());
      prisma.websiteDeployment.update.mockResolvedValue(
        fakeDeploymentRow({ status: 'FAILED', errorMessage: 'Vercel: HTTP 500' }),
      );
      deploymentProvider.deploy.mockRejectedValue(new Error('Vercel: HTTP 500'));

      const result = await service.requestDeployment('lead-1', {}, 'actor-1');

      expect(result.status).toBe('failed');
      expect(prisma.websiteDeployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED', errorMessage: 'Vercel: HTTP 500' }),
        }),
      );
      expect(healthCheckEngineService.runCheck).not.toHaveBeenCalled();
    });
  });

  describe('retryDeployment', () => {
    it('throws WebsiteDeploymentNotFoundException when the target belongs to a different business', async () => {
      prisma.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ businessId: 'other-business' }),
      );
      await expect(
        service.retryDeployment('lead-1', 'deployment-1', 'actor-1'),
      ).rejects.toBeInstanceOf(WebsiteDeploymentNotFoundException);
    });

    it('throws DeploymentNotRetryableException when the target is not FAILED', async () => {
      prisma.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ status: 'COMPLETED' }),
      );
      await expect(
        service.retryDeployment('lead-1', 'deployment-1', 'actor-1'),
      ).rejects.toBeInstanceOf(DeploymentNotRetryableException);
    });

    it('re-deploys the same generatedWebsite version the failed attempt used, setting retryOfDeploymentId', async () => {
      prisma.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ status: 'FAILED', generatedWebsiteId: 'gw-1' }),
      );
      prisma.generatedWebsite.findUniqueOrThrow.mockResolvedValue(
        fakeGeneratedWebsite({ id: 'gw-1', configVersion: 3 }),
      );
      prisma.websiteDeployment.create.mockResolvedValue(fakeDeploymentRow({ id: 'deployment-2' }));
      prisma.websiteDeployment.update.mockResolvedValue(
        fakeDeploymentRow({ id: 'deployment-2', status: 'COMPLETED' }),
      );
      prisma.websiteDeployment.findUniqueOrThrow.mockResolvedValue(
        fakeDeploymentRow({ id: 'deployment-2', status: 'COMPLETED' }),
      );
      deploymentProvider.deploy.mockResolvedValue({
        providerDeploymentId: 'dpl_2',
        liveUrl: 'https://x.vercel.app',
      });

      await service.retryDeployment('lead-1', 'deployment-1', 'actor-1');

      expect(prisma.generatedWebsite.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'gw-1' },
      });
      expect(prisma.websiteDeployment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ retryOfDeploymentId: 'deployment-1' }),
        }),
      );
    });
  });

  describe('listForLead', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.listForLead('missing', { limit: 25 })).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('paginates newest-version-first', async () => {
      prisma.websiteDeployment.findMany.mockResolvedValue([fakeDeploymentRow()]);
      await service.listForLead('lead-1', { limit: 25 });
      expect(prisma.websiteDeployment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'business-1' },
          orderBy: { deploymentVersion: 'desc' },
        }),
      );
    });
  });

  describe('findByIdOrThrow', () => {
    it('throws WebsiteDeploymentNotFoundException for an unknown id', async () => {
      prisma.websiteDeployment.findUnique.mockResolvedValue(null);
      await expect(service.findByIdOrThrow('lead-1', 'missing')).rejects.toBeInstanceOf(
        WebsiteDeploymentNotFoundException,
      );
    });
  });
});
