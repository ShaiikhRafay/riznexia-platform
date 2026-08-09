import type { PrismaClient } from '@riznexia/db';
import {
  LeadNotFoundException,
  WebsiteDeploymentNotFoundException,
} from '../../common/exceptions/app.exception';
import type { LeadsService } from '../../leads/leads.service';
import { HealthCheckEngineService } from './health-check-engine.service';

function fakeDeploymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deployment-1',
    businessId: 'business-1',
    status: 'COMPLETED',
    liveUrl: 'https://example.vercel.app',
    healthStatus: 'UNKNOWN',
    ...overrides,
  };
}

function fakeHealthCheckRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'check-1',
    deploymentId: 'deployment-1',
    status: 'HEALTHY',
    checkedAt: new Date(),
    responseTimeMs: 100,
    httpStatusCode: 200,
    detail: { checks: [] },
    ...overrides,
  };
}

describe('HealthCheckEngineService', () => {
  let prisma: {
    websiteDeployment: { findUnique: jest.Mock; update: jest.Mock };
    deploymentHealthCheck: { create: jest.Mock; findMany: jest.Mock; findFirstOrThrow: jest.Mock };
    domain: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let leadsService: { findById: jest.Mock };
  let service: HealthCheckEngineService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      websiteDeployment: {
        findUnique: jest.fn().mockResolvedValue(fakeDeploymentRow()),
        update: jest.fn(),
      },
      deploymentHealthCheck: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      domain: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    leadsService = { findById: jest.fn().mockResolvedValue({ businessId: 'business-1' }) };
    service = new HealthCheckEngineService(
      prisma as unknown as PrismaClient,
      leadsService as unknown as LeadsService,
    );
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('runCheck', () => {
    it('is a no-op that never throws when the deployment no longer exists', async () => {
      prisma.websiteDeployment.findUnique.mockResolvedValue(null);
      await expect(service.runCheck('missing', 'https://example.com')).resolves.toBeUndefined();
      expect(prisma.deploymentHealthCheck.create).not.toHaveBeenCalled();
    });

    it('records HEALTHY when the URL responds 200 and there is no domain to check', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      await service.runCheck('deployment-1', 'https://example.vercel.app');

      expect(prisma.deploymentHealthCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'HEALTHY', httpStatusCode: 200 }),
        }),
      );
      expect(prisma.websiteDeployment.update).toHaveBeenCalledWith({
        where: { id: 'deployment-1' },
        data: { healthStatus: 'HEALTHY' },
      });
    });

    it('records UNHEALTHY when the URL responds with a non-2xx status', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });
      await service.runCheck('deployment-1', 'https://example.vercel.app');
      expect(prisma.deploymentHealthCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'UNHEALTHY' }) }),
      );
    });

    it('records UNHEALTHY (never throws) when the fetch itself rejects, e.g. DNS not resolved yet', async () => {
      fetchMock.mockRejectedValue(new Error('fetch failed'));
      await expect(
        service.runCheck('deployment-1', 'https://example.vercel.app'),
      ).resolves.toBeUndefined();
      expect(prisma.deploymentHealthCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'UNHEALTHY', httpStatusCode: null }),
        }),
      );
    });

    it('treats an empty liveUrl as unreachable without calling fetch', async () => {
      await service.runCheck('deployment-1', '');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(prisma.deploymentHealthCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'UNHEALTHY' }) }),
      );
    });

    it('fails domain_status/ssl_status (and overall health) when the current domain is not verified/active', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      prisma.domain.findFirst.mockResolvedValue({
        hostname: 'example.com',
        verificationStatus: 'PENDING',
        sslStatus: 'PENDING',
      });

      await service.runCheck('deployment-1', 'https://example.vercel.app');

      expect(prisma.deploymentHealthCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'UNHEALTHY' }) }),
      );
    });

    it('passes when the current domain is verified and SSL is active', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      prisma.domain.findFirst.mockResolvedValue({
        hostname: 'example.com',
        verificationStatus: 'VERIFIED',
        sslStatus: 'ACTIVE',
      });

      await service.runCheck('deployment-1', 'https://example.vercel.app');

      expect(prisma.deploymentHealthCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'HEALTHY' }) }),
      );
    });

    it('fails deployment_status when the row is not COMPLETED (e.g. called too early)', async () => {
      prisma.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ status: 'IN_PROGRESS' }),
      );
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      await service.runCheck('deployment-1', 'https://example.vercel.app');

      expect(prisma.deploymentHealthCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'UNHEALTHY' }) }),
      );
    });
  });

  describe('listForDeployment', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(
        service.listForDeployment('missing', 'deployment-1', { limit: 25 }),
      ).rejects.toBeInstanceOf(LeadNotFoundException);
    });

    it('throws WebsiteDeploymentNotFoundException when the deployment belongs to a different business', async () => {
      prisma.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ businessId: 'other-business' }),
      );
      await expect(
        service.listForDeployment('lead-1', 'deployment-1', { limit: 25 }),
      ).rejects.toBeInstanceOf(WebsiteDeploymentNotFoundException);
    });

    it('returns the mapped, paginated history', async () => {
      prisma.deploymentHealthCheck.findMany.mockResolvedValue([fakeHealthCheckRow()]);
      const result = await service.listForDeployment('lead-1', 'deployment-1', { limit: 25 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.status).toBe('healthy');
    });
  });

  describe('triggerManualCheck', () => {
    it('runs a fresh check and returns the newly created row', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      prisma.deploymentHealthCheck.findFirstOrThrow.mockResolvedValue(fakeHealthCheckRow());

      const result = await service.triggerManualCheck('lead-1', 'deployment-1');

      expect(prisma.deploymentHealthCheck.create).toHaveBeenCalled();
      expect(result.id).toBe('check-1');
    });
  });
});
