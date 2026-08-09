import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// End-to-end check of the full request chain for Module M11 (Deployment)
// — guards, permission checks, validation pipes, controllers, services,
// and the real VercelProvider/VercelAdapter (with `fetch` itself mocked,
// same convention as every adapter spec in this repo) wired together for
// real, against a mocked data layer.
describe('Deployment (e2e)', () => {
  let app: INestApplication;

  const LEAD_ID = '11111111-1111-4111-8111-111111111111';
  const BUSINESS_ID = '22222222-2222-4222-8222-222222222222';
  const GENERATED_WEBSITE_ID = '33333333-3333-4333-8333-333333333333';
  const DEPLOYMENT_ID = '44444444-4444-4444-8444-444444444444';
  const OTHER_DEPLOYMENT_ID = '55555555-5555-4555-8555-555555555555';
  const DOMAIN_ID = '66666666-6666-4666-8666-666666666666';
  const UNKNOWN_LEAD_ID = '77777777-7777-4777-8777-777777777777';

  const fakeBusinessRelation = {
    id: BUSINESS_ID,
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    websiteStatus: 'NONE',
    deletedAt: null,
  };

  const leadRow = {
    id: LEAD_ID,
    businessId: BUSINESS_ID,
    pipelineStage: 'NEW',
    assignedToId: null,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    business: fakeBusinessRelation,
  };

  const businessRow = { businessName: "Joe's Diner" };

  const generatedWebsiteRow = {
    id: GENERATED_WEBSITE_ID,
    businessId: BUSINESS_ID,
    configVersion: 1,
    files: [{ path: 'package.json', content: '{}' }],
  };

  const PREVIEW_REPORT_ID = '88888888-8888-4888-8888-888888888888';

  const passingPreviewReport = {
    id: PREVIEW_REPORT_ID,
    businessId: BUSINESS_ID,
    generatedWebsiteId: GENERATED_WEBSITE_ID,
    previewVersion: 1,
    generatedWebsiteVersion: 1,
    validationVersion: 'v1.0',
    generatedByModuleVersion: 'v1.0',
    rules: [],
    validationTimestamp: new Date('2026-01-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const failingPreviewReport = {
    ...passingPreviewReport,
    rules: [
      {
        ruleId: 'seo-1',
        ruleCategory: 'seo',
        ruleName: 'Missing title',
        severity: 'high',
        status: 'error',
        message: 'Missing <title>',
        recommendation: null,
        documentationUrl: null,
      },
    ],
  };

  function fakeDeploymentRow(overrides: Record<string, unknown> = {}) {
    return {
      id: DEPLOYMENT_ID,
      businessId: BUSINESS_ID,
      generatedWebsiteId: GENERATED_WEBSITE_ID,
      generatedWebsiteVersion: 1,
      deploymentVersion: 1,
      provider: 'VERCEL',
      providerVersion: 'v1.0',
      providerDeploymentId: 'dpl_1',
      environment: 'PRODUCTION',
      commitHash: null,
      status: 'COMPLETED',
      healthStatus: 'HEALTHY',
      liveUrl: 'https://joes-diner.vercel.app',
      errorMessage: null,
      deploymentHash: 'abc',
      deploymentEngineVersion: 'v1.0',
      rollbackFromDeploymentId: null,
      retryOfDeploymentId: null,
      buildStartedAt: new Date('2026-01-01T00:00:00Z'),
      buildCompletedAt: new Date('2026-01-01T00:00:00Z'),
      completedAt: new Date('2026-01-01T00:00:00Z'),
      executionDuration: 1000,
      createdById: 'member-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    };
  }

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn().mockResolvedValue(leadRow) },
    business: { findUniqueOrThrow: jest.fn().mockResolvedValue(businessRow) },
    generatedWebsite: {
      findFirst: jest.fn().mockResolvedValue(generatedWebsiteRow),
      findUniqueOrThrow: jest.fn().mockResolvedValue(generatedWebsiteRow),
    },
    previewReport: { findFirst: jest.fn().mockResolvedValue(passingPreviewReport) },
    websiteDeployment: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    deploymentHealthCheck: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirstOrThrow: jest.fn(),
    },
    domain: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((arg: unknown) =>
      Array.isArray(arg)
        ? Promise.all(arg as Promise<unknown>[])
        : (arg as (tx: unknown) => unknown)(prismaMock),
    ),
  };
  const cacheMock = {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn(),
    getOrSetJson: jest.fn(async (_k: string, _t: number, compute: () => Promise<unknown>) =>
      compute(),
    ),
    incrementCounter: jest.fn().mockResolvedValue(0),
    getCounter: jest.fn().mockResolvedValue(0),
    delete: jest.fn(),
  };
  const clerkServiceMock = { verifyToken: jest.fn().mockResolvedValue({ sub: 'user_1' }) };
  let fetchMock: jest.Mock;

  beforeAll(async () => {
    process.env.VERCEL_API_TOKEN = 'test-vercel-token';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(prismaMock)
      .overrideProvider(REDIS_CACHE)
      .useValue(cacheMock)
      .overrideProvider(ClerkService)
      .useValue(clerkServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    delete process.env.VERCEL_API_TOKEN;
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    prismaMock.lead.findUnique.mockResolvedValue(leadRow);
    prismaMock.business.findUniqueOrThrow.mockResolvedValue(businessRow);
    prismaMock.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
    prismaMock.generatedWebsite.findUniqueOrThrow.mockResolvedValue(generatedWebsiteRow);
    prismaMock.previewReport.findFirst.mockResolvedValue(passingPreviewReport);
    prismaMock.websiteDeployment.findFirst.mockResolvedValue(null);
    prismaMock.domain.findFirst.mockResolvedValue(null);
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  function authenticateAs(role: string, memberId = 'member-1'): void {
    clerkServiceMock.verifyToken.mockResolvedValue({ sub: 'user_1' });
    prismaMock.teamMember.findUnique.mockImplementation(({ where }: { where: { id?: string } }) => {
      if (where.id) {
        return Promise.resolve({
          id: where.id,
          clerkUserId: 'user_x',
          name: 'X',
          email: 'x@riznexia.com',
          role: 'ADMIN',
        });
      }
      return Promise.resolve({
        id: memberId,
        clerkUserId: 'user_1',
        name: 'Test User',
        email: 'test@riznexia.com',
        role: role.toUpperCase(),
      });
    });
  }

  function authed(method: 'get' | 'post' | 'patch' | 'delete', path: string): request.Test {
    return request(app.getHttpServer())[method](path).set('Authorization', 'Bearer valid.jwt');
  }

  function mockFetchForVercelDeploy(readyState: 'READY' | 'ERROR' = 'READY') {
    fetchMock = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/v13/deployments')) {
        return Promise.resolve({
          ok: readyState !== 'ERROR',
          status: readyState === 'ERROR' ? 500 : 200,
          json: () =>
            Promise.resolve(
              readyState === 'ERROR'
                ? { error: { message: 'Build failed' } }
                : {
                    id: 'dpl_1',
                    url: 'joes-diner.vercel.app',
                    name: 'joes-diner',
                    readyState: 'READY',
                  },
            ),
        });
      }
      // The Health Check Engine's own plain GET against the live URL.
      return Promise.resolve({ ok: true, status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  }

  describe('POST /leads/:id/deployments', () => {
    it('returns LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs('sales_executive');
      prismaMock.lead.findUnique.mockResolvedValue(null);
      const response = await authed('post', `/leads/${UNKNOWN_LEAD_ID}/deployments`).send({});
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('returns GENERATED_WEBSITE_NOT_FOUND when no website has been assembled yet', async () => {
      authenticateAs('sales_executive');
      prismaMock.generatedWebsite.findFirst.mockResolvedValue(null);
      const response = await authed('post', `/leads/${LEAD_ID}/deployments`).send({});
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('GENERATED_WEBSITE_NOT_FOUND');
    });

    it('returns DEPLOYMENT_VALIDATION_FAILED (422) when publish-readiness has not passed, and never creates a row', async () => {
      authenticateAs('sales_executive');
      prismaMock.previewReport.findFirst.mockResolvedValue(failingPreviewReport);
      const response = await authed('post', `/leads/${LEAD_ID}/deployments`).send({});
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('DEPLOYMENT_VALIDATION_FAILED');
      expect(prismaMock.websiteDeployment.create).not.toHaveBeenCalled();
    });

    it('rejects a caller without deployment:create (viewer) with 403', async () => {
      authenticateAs('viewer');
      const response = await authed('post', `/leads/${LEAD_ID}/deployments`).send({});
      expect(response.status).toBe(403);
      expect(prismaMock.websiteDeployment.create).not.toHaveBeenCalled();
    });

    it('deploys successfully, returns 201 with a completed+healthy deployment, runs a health check, and writes an audit log entry', async () => {
      authenticateAs('sales_executive');
      mockFetchForVercelDeploy('READY');
      prismaMock.websiteDeployment.create.mockResolvedValue(
        fakeDeploymentRow({ status: 'REQUESTED' }),
      );
      prismaMock.websiteDeployment.update
        .mockResolvedValueOnce(fakeDeploymentRow({ status: 'IN_PROGRESS' }))
        .mockResolvedValueOnce(fakeDeploymentRow({ status: 'COMPLETED' }))
        .mockResolvedValueOnce(fakeDeploymentRow({ status: 'COMPLETED', healthStatus: 'HEALTHY' }));
      prismaMock.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ status: 'COMPLETED' }),
      );
      prismaMock.websiteDeployment.findUniqueOrThrow.mockResolvedValue(
        fakeDeploymentRow({ status: 'COMPLETED', healthStatus: 'HEALTHY' }),
      );

      const response = await authed('post', `/leads/${LEAD_ID}/deployments`).send({
        commitHash: 'abc123',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ status: 'completed', provider: 'vercel' });
      expect(prismaMock.deploymentHealthCheck.create).toHaveBeenCalled();
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'deployment.requested' }),
        }),
      );
    });

    it('marks the deployment FAILED and still returns 201 (not an HTTP error) when the provider call fails', async () => {
      authenticateAs('sales_executive');
      mockFetchForVercelDeploy('ERROR');
      prismaMock.websiteDeployment.create.mockResolvedValue(
        fakeDeploymentRow({ status: 'REQUESTED' }),
      );
      prismaMock.websiteDeployment.update
        .mockResolvedValueOnce(fakeDeploymentRow({ status: 'IN_PROGRESS' }))
        .mockResolvedValueOnce(
          fakeDeploymentRow({ status: 'FAILED', errorMessage: 'Vercel: Build failed' }),
        );

      const response = await authed('post', `/leads/${LEAD_ID}/deployments`).send({});

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('failed');
      expect(prismaMock.deploymentHealthCheck.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /leads/:id/deployments/:deploymentId/retry', () => {
    it('returns DEPLOYMENT_NOT_RETRYABLE when the target is not FAILED', async () => {
      authenticateAs('sales_executive');
      prismaMock.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ status: 'COMPLETED' }),
      );
      const response = await authed('post', `/leads/${LEAD_ID}/deployments/${DEPLOYMENT_ID}/retry`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('DEPLOYMENT_NOT_RETRYABLE');
    });

    it('re-deploys a failed target, creating a new row with retryOfDeploymentId set', async () => {
      authenticateAs('sales_executive');
      mockFetchForVercelDeploy('READY');
      prismaMock.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ status: 'FAILED' }),
      );
      prismaMock.websiteDeployment.create.mockResolvedValue(
        fakeDeploymentRow({ id: OTHER_DEPLOYMENT_ID, status: 'REQUESTED' }),
      );
      prismaMock.websiteDeployment.update
        .mockResolvedValueOnce(
          fakeDeploymentRow({ id: OTHER_DEPLOYMENT_ID, status: 'IN_PROGRESS' }),
        )
        .mockResolvedValueOnce(fakeDeploymentRow({ id: OTHER_DEPLOYMENT_ID, status: 'COMPLETED' }));
      prismaMock.websiteDeployment.findUniqueOrThrow.mockResolvedValue(
        fakeDeploymentRow({ id: OTHER_DEPLOYMENT_ID, status: 'COMPLETED' }),
      );

      const response = await authed('post', `/leads/${LEAD_ID}/deployments/${DEPLOYMENT_ID}/retry`);

      expect(response.status).toBe(201);
      expect(prismaMock.websiteDeployment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ retryOfDeploymentId: DEPLOYMENT_ID }),
        }),
      );
    });
  });

  describe('POST /leads/:id/deployments/:deploymentId/rollback', () => {
    it('returns INVALID_ROLLBACK_TARGET when the target is not COMPLETED+HEALTHY', async () => {
      authenticateAs('admin');
      prismaMock.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ status: 'FAILED' }),
      );
      const response = await authed(
        'post',
        `/leads/${LEAD_ID}/deployments/${DEPLOYMENT_ID}/rollback`,
      );
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ROLLBACK_TARGET');
    });

    it('rejects a caller without deployment:rollback (sales_executive) with 403 — rollback is manager-and-up only', async () => {
      authenticateAs('sales_executive');
      const response = await authed(
        'post',
        `/leads/${LEAD_ID}/deployments/${DEPLOYMENT_ID}/rollback`,
      );
      expect(response.status).toBe(403);
    });

    it('rolls back to a healthy target, deploying its historical GeneratedWebsite snapshot again', async () => {
      authenticateAs('admin');
      mockFetchForVercelDeploy('READY');
      prismaMock.websiteDeployment.findUnique.mockResolvedValue(
        fakeDeploymentRow({ status: 'COMPLETED', healthStatus: 'HEALTHY' }),
      );
      prismaMock.websiteDeployment.create.mockResolvedValue(
        fakeDeploymentRow({ id: OTHER_DEPLOYMENT_ID, status: 'REQUESTED' }),
      );
      prismaMock.websiteDeployment.update
        .mockResolvedValueOnce(
          fakeDeploymentRow({ id: OTHER_DEPLOYMENT_ID, status: 'IN_PROGRESS' }),
        )
        .mockResolvedValueOnce(fakeDeploymentRow({ id: OTHER_DEPLOYMENT_ID, status: 'COMPLETED' }));
      prismaMock.websiteDeployment.findUniqueOrThrow.mockResolvedValue(
        fakeDeploymentRow({ id: OTHER_DEPLOYMENT_ID, status: 'COMPLETED' }),
      );

      const response = await authed(
        'post',
        `/leads/${LEAD_ID}/deployments/${DEPLOYMENT_ID}/rollback`,
      );

      expect(response.status).toBe(201);
      expect(prismaMock.websiteDeployment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rollbackFromDeploymentId: DEPLOYMENT_ID }),
        }),
      );
    });
  });

  describe('GET /leads/:id/deployments/:deploymentId/health + POST .../health-check', () => {
    it('lists health check history, readable by viewer', async () => {
      authenticateAs('viewer');
      prismaMock.websiteDeployment.findUnique.mockResolvedValue(fakeDeploymentRow());
      prismaMock.deploymentHealthCheck.findMany.mockResolvedValue([
        {
          id: 'check-1',
          deploymentId: DEPLOYMENT_ID,
          status: 'HEALTHY',
          checkedAt: new Date(),
          responseTimeMs: 100,
          httpStatusCode: 200,
          detail: null,
        },
      ]);
      const response = await authed('get', `/leads/${LEAD_ID}/deployments/${DEPLOYMENT_ID}/health`);
      expect(response.status).toBe(200);
      expect(response.body.items[0]).toMatchObject({ status: 'healthy' });
    });

    it('rejects a manual health-check trigger without deployment:manage (sales_executive) with 403', async () => {
      authenticateAs('sales_executive');
      const response = await authed(
        'post',
        `/leads/${LEAD_ID}/deployments/${DEPLOYMENT_ID}/health-check`,
      );
      expect(response.status).toBe(403);
    });

    it('allows admin to manually trigger a health check', async () => {
      authenticateAs('admin');
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
      prismaMock.websiteDeployment.findUnique.mockResolvedValue(fakeDeploymentRow());
      prismaMock.deploymentHealthCheck.findFirstOrThrow.mockResolvedValue({
        id: 'check-1',
        deploymentId: DEPLOYMENT_ID,
        status: 'HEALTHY',
        checkedAt: new Date(),
        responseTimeMs: 50,
        httpStatusCode: 200,
        detail: null,
      });

      const response = await authed(
        'post',
        `/leads/${LEAD_ID}/deployments/${DEPLOYMENT_ID}/health-check`,
      );

      expect(response.status).toBe(201);
      expect(prismaMock.deploymentHealthCheck.create).toHaveBeenCalled();
    });
  });

  describe('POST/GET /leads/:id/domains', () => {
    it('rejects an invalid hostname with VALIDATION_ERROR', async () => {
      authenticateAs('admin');
      const response = await authed('post', `/leads/${LEAD_ID}/domains`).send({
        hostname: 'not a domain',
        type: 'custom',
      });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects domain registration without deployment:manage (sales_executive) with 403', async () => {
      authenticateAs('sales_executive');
      const response = await authed('post', `/leads/${LEAD_ID}/domains`).send({
        hostname: 'example.com',
        type: 'custom',
      });
      expect(response.status).toBe(403);
    });

    it('registers a domain, readable by viewer afterward', async () => {
      authenticateAs('admin');
      prismaMock.domain.create.mockResolvedValue({
        id: DOMAIN_ID,
        businessId: BUSINESS_ID,
        hostname: 'example.com',
        type: 'CUSTOM',
        provider: 'VERCEL',
        verificationStatus: 'PENDING',
        verificationRecord: null,
        sslStatus: 'PENDING',
        currentDeploymentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createResponse = await authed('post', `/leads/${LEAD_ID}/domains`).send({
        hostname: 'example.com',
        type: 'custom',
      });
      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toMatchObject({
        hostname: 'example.com',
        verificationStatus: 'pending',
      });

      authenticateAs('viewer');
      prismaMock.domain.findMany.mockResolvedValue([
        {
          ...createResponse.body,
          type: 'CUSTOM',
          provider: 'VERCEL',
          verificationStatus: 'PENDING',
          sslStatus: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const listResponse = await authed('get', `/leads/${LEAD_ID}/domains`);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toHaveLength(1);
    });
  });

  describe('GET /leads/:id/deployment-status', () => {
    it('reports productionReady=false with no deployment yet, readable by developer', async () => {
      authenticateAs('developer');
      const response = await authed('get', `/leads/${LEAD_ID}/deployment-status`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        productionReady: false,
        latestDeployment: null,
        domain: null,
      });
    });

    it('reports productionReady=true when the latest deployment is completed and healthy', async () => {
      authenticateAs('developer');
      prismaMock.websiteDeployment.findFirst.mockResolvedValue(fakeDeploymentRow());
      const response = await authed('get', `/leads/${LEAD_ID}/deployment-status`);
      expect(response.status).toBe(200);
      expect(response.body.productionReady).toBe(true);
    });
  });

  describe('GET /leads/:id/deployments — history', () => {
    it('returns DEPLOYMENT_VALIDATION_FAILED is never leaked into a list call, and lists newest-version-first', async () => {
      authenticateAs('viewer');
      prismaMock.websiteDeployment.findMany.mockResolvedValue([fakeDeploymentRow()]);
      const response = await authed('get', `/leads/${LEAD_ID}/deployments`);
      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(prismaMock.websiteDeployment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { deploymentVersion: 'desc' } }),
      );
    });
  });
});
