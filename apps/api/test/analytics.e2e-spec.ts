import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// End-to-end check of the full request chain for Module M12 (Analytics &
// Reporting) — guards, permission checks, validation pipes, controllers,
// the Analytics/Aggregation/Reporting/Dashboard/Export engines, and the
// SelfHostedAnalyticsProvider all wired together for real, against a
// mocked data layer. Every Prisma model method the engines touch is given
// a neutral empty/zero default so any of the fifteen report types can be
// exercised without throwing; individual tests override only what they
// need to assert on.
describe('Analytics & Reporting (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    teamMember: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    discoveryJob: {
      aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: { resultsCount: 0 } }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    placeSyncJob: {
      aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: { apiCallsUsed: 0 } }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    salesStage: { findMany: jest.fn().mockResolvedValue([]) },
    leadCRM: { findMany: jest.fn().mockResolvedValue([]) },
    leadActivity: { findMany: jest.fn().mockResolvedValue([]) },
    business: { groupBy: jest.fn().mockResolvedValue([]) },
    businessAnalysis: {
      aggregate: jest.fn().mockResolvedValue({
        _count: 0,
        _sum: { totalTokens: 0 },
        _avg: { executionTimeMs: null },
      }),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    costEvent: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { costUsd: 0 } }),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    themeConfiguration: { groupBy: jest.fn().mockResolvedValue([]) },
    generatedWebsite: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    publishReadinessReport: { findMany: jest.fn().mockResolvedValue([]) },
    websiteDeployment: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _avg: { executionDuration: null } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
    },
    analyticsEvent: { create: jest.fn().mockResolvedValue({}) },
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

  beforeAll(async () => {
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
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    cacheMock.getCounter.mockResolvedValue(0);
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

  function authed(path: string): request.Test {
    return request(app.getHttpServer()).get(path).set('Authorization', 'Bearer valid.jwt');
  }

  describe('GET /analytics/dashboard', () => {
    it('rejects a caller without analytics:view (sales_executive) with 403', async () => {
      authenticateAs('sales_executive');
      const response = await authed('/analytics/dashboard');
      expect(response.status).toBe(403);
    });

    it('is readable by viewer and returns all eight widgets composed from Analytics Engine facts', async () => {
      authenticateAs('viewer');
      const response = await authed('/analytics/dashboard');
      expect(response.status).toBe(200);
      expect(response.body.period).toBe('monthly');
      expect(Object.keys(response.body.widgets).sort()).toEqual(
        [
          'aiUsage',
          'conversion',
          'costs',
          'deployments',
          'leads',
          'sales',
          'systemHealth',
          'websiteStatus',
        ].sort(),
      );
    });

    it('is readable by developer (analytics:view only, same restricted tier as viewer)', async () => {
      authenticateAs('developer');
      const response = await authed('/analytics/dashboard');
      expect(response.status).toBe(200);
    });

    it('logs a dashboard_viewed analytics event via the SelfHostedAnalyticsProvider, without failing the request', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/dashboard');
      expect(response.status).toBe(200);
      expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'dashboard_viewed' }),
        }),
      );
    });

    it('rejects period=custom with no fromDate/toDate as INVALID_AGGREGATION_RANGE', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/dashboard?period=custom');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_AGGREGATION_RANGE');
    });
  });

  describe('GET /analytics/reports/:type', () => {
    it('rejects a caller without analytics:report (sales_executive) with 403', async () => {
      authenticateAs('sales_executive');
      const response = await authed('/analytics/reports/lead_funnel');
      expect(response.status).toBe(403);
    });

    it('rejects viewer/developer (analytics:view only, not analytics:report) with 403', async () => {
      authenticateAs('viewer');
      const response = await authed('/analytics/reports/lead_funnel');
      expect(response.status).toBe(403);
    });

    it('rejects an unknown report type with VALIDATION_ERROR (400)', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/reports/not_a_real_report');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('generates the lead_funnel report for admin, wrapped in the standard envelope', async () => {
      authenticateAs('admin');
      prismaMock.salesStage.findMany.mockResolvedValue([
        { key: 'new', name: 'New', _count: { leadCrms: 3 } },
        { key: 'won', name: 'Won', _count: { leadCrms: 2 } },
      ]);
      const response = await authed('/analytics/reports/lead_funnel');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        reportType: 'lead_funnel',
        period: 'monthly',
        data: {
          totalLeads: 5,
          stages: [
            { stageKey: 'new', stageName: 'New', count: 3 },
            { stageKey: 'won', stageName: 'Won', count: 2 },
          ],
        },
      });
    });

    it('generates the sales_performance report for sales_manager as a direct passthrough of ReportingService', async () => {
      authenticateAs('sales_manager');
      const response = await authed('/analytics/reports/sales_performance');
      expect(response.status).toBe(200);
      expect(response.body.reportType).toBe('sales_performance');
      expect(response.body.data).toMatchObject({
        totalPipelineValueUsd: 0,
        conversionRatePercent: null,
      });
    });

    it('generates the executive_dashboard report by sharing DashboardEngineService.composeWidgets — not a second implementation', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/reports/executive_dashboard');
      expect(response.status).toBe(200);
      expect(response.body.reportType).toBe('executive_dashboard');
      expect(Object.keys(response.body.data).sort()).toEqual(
        [
          'aiUsage',
          'conversion',
          'costs',
          'deployments',
          'leads',
          'sales',
          'systemHealth',
          'websiteStatus',
        ].sort(),
      );
    });

    it('paginates the audit report via cursor/limit, never leaking the full table', async () => {
      authenticateAs('admin');
      prismaMock.auditLog.findMany.mockResolvedValue([
        {
          id: 'a1',
          actorId: 'member-1',
          action: 'lead.created',
          entityType: 'Lead',
          entityId: 'l1',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ]);
      const response = await authed('/analytics/reports/audit?limit=1');
      expect(response.status).toBe(200);
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }),
      );
      expect(response.body.data.items).toHaveLength(1);
    });

    it('logs a report_generated analytics event through the SelfHostedAnalyticsProvider', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/reports/health');
      expect(response.status).toBe(200);
      expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'report_generated', entityId: 'health' }),
        }),
      );
    });

    it('resolves a custom period with explicit fromDate/toDate', async () => {
      authenticateAs('admin');
      const response = await authed(
        '/analytics/reports/ai_cost?period=custom&fromDate=2026-01-01T00:00:00.000Z&toDate=2026-02-01T00:00:00.000Z',
      );
      expect(response.status).toBe(200);
      expect(response.body.period).toBe('custom');
    });
  });

  describe('GET /analytics/reports/:type/export', () => {
    it('rejects a caller without analytics:export (developer) with 403', async () => {
      authenticateAs('developer');
      const response = await authed('/analytics/reports/business_category/export?format=csv');
      expect(response.status).toBe(403);
    });

    it('exports business_category as a real, downloadable CSV for admin', async () => {
      authenticateAs('admin');
      prismaMock.business.groupBy.mockResolvedValue([{ category: 'restaurant', _count: 4 }]);
      const response = await authed('/analytics/reports/business_category/export?format=csv');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toBe('label,count\nrestaurant,4');
    });

    it('rejects format=pdf with EXPORT_FORMAT_NOT_IMPLEMENTED (501), never computing the report', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/reports/business_category/export?format=pdf');
      expect(response.status).toBe(501);
      expect(response.body.error.code).toBe('EXPORT_FORMAT_NOT_IMPLEMENTED');
      expect(prismaMock.business.groupBy).not.toHaveBeenCalled();
    });

    it('rejects format=excel with EXPORT_FORMAT_NOT_IMPLEMENTED (501)', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/reports/business_category/export?format=excel');
      expect(response.status).toBe(501);
      expect(response.body.error.code).toBe('EXPORT_FORMAT_NOT_IMPLEMENTED');
    });

    it('logs export_started and export_completed analytics events through the SelfHostedAnalyticsProvider', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/reports/business_category/export?format=csv');
      expect(response.status).toBe(200);
      expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ eventType: 'export_started' }) }),
      );
      expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'export_completed' }),
        }),
      );
    });

    it('rejects a missing format with VALIDATION_ERROR (400) — format has no default, unlike period', async () => {
      authenticateAs('admin');
      const response = await authed('/analytics/reports/business_category/export');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
