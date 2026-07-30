import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AiProviderName,
  AnalysisStatus as PrismaAnalysisStatus,
  BusinessOperatingStatus,
  BusinessSourceProvider,
  PipelineStage,
  WebsiteStatusType,
} from '@riznexia/db';
import { AI_TEXT_PROVIDER } from '@riznexia/ai';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ClerkService } from '../src/auth/clerk.service';

// End-to-end check of the full request chain for Module M6 — guards,
// validation pipes, controllers, services, and the (mocked) data layer
// wired together for real, same pattern as test/place-sync.e2e-spec.ts.
// AI_TEXT_PROVIDER is overridden with a mock so no real Anthropic call is
// ever made from a test.
describe('Business Analysis (e2e)', () => {
  let app: INestApplication;

  const LEAD_ID = '11111111-1111-4111-8111-111111111111';
  const BUSINESS_ID = '22222222-2222-4222-8222-222222222222';
  const UNKNOWN_LEAD_ID = '33333333-3333-4333-8333-333333333333';

  const business = {
    id: BUSINESS_ID,
    googlePlaceId: 'place-1',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    placesData: {},
    websiteStatus: WebsiteStatusType.NONE,
    latitude: null,
    longitude: null,
    phone: null,
    rating: 4.5,
    reviewCount: 120,
    openingHours: null,
    photos: null,
    businessStatus: BusinessOperatingStatus.OPERATIONAL,
    googleBusinessUrl: null,
    websiteDetectedAt: null,
    websiteDetectionMethod: null,
    syncVersion: 1,
    sourceProvider: BusinessSourceProvider.GOOGLE,
    lastSyncedAt: null,
    lastSyncJobId: null,
    discoveryJobId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const leadRow = {
    id: LEAD_ID,
    businessId: BUSINESS_ID,
    pipelineStage: PipelineStage.NEW,
    assignedToId: null,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    business,
  };

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn() },
    business: { findUnique: jest.fn() },
    businessAnalysis: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    costEvent: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prismaMock)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  const cacheMock = {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn(),
    incrementCounter: jest.fn().mockResolvedValue(0),
    getCounter: jest.fn().mockResolvedValue(0),
    delete: jest.fn(),
  };
  const clerkServiceMock = { verifyToken: jest.fn() };
  const aiTextProviderMock = { name: 'CLAUDE', complete: jest.fn() };

  const salesRep = {
    id: 'rep-1',
    clerkUserId: 'user_1',
    name: 'Jane Doe',
    email: 'jane@riznexia.com',
    role: 'SALES_EXECUTIVE',
  };
  const viewer = {
    id: 'viewer-1',
    clerkUserId: 'user_viewer',
    name: 'Vic Viewer',
    email: 'vic@riznexia.com',
    role: 'VIEWER',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(prismaMock)
      .overrideProvider(REDIS_CACHE)
      .useValue(cacheMock)
      .overrideProvider(ClerkService)
      .useValue(clerkServiceMock)
      .overrideProvider(AI_TEXT_PROVIDER)
      .useValue(aiTextProviderMock)
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

  beforeEach(() => {
    // The fire-and-forget runner (BusinessAnalysisRunnerService.run) is
    // dispatched but never awaited by these HTTP-level tests — give it a
    // resolvable fixture so it doesn't log spurious "unhandled error"
    // noise while the assertions above only check the synchronous
    // HTTP response.
    prismaMock.businessAnalysis.findUniqueOrThrow.mockResolvedValue({
      id: 'analysis-1',
      businessId: BUSINESS_ID,
      analysisVersion: 1,
      business,
    });
  });

  function authenticateAs(member: typeof salesRep): void {
    clerkServiceMock.verifyToken.mockResolvedValue({ sub: member.clerkUserId });
    prismaMock.teamMember.findUnique.mockResolvedValue(member);
  }

  function fakeAnalysisRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'analysis-1',
      businessId: BUSINESS_ID,
      analysisVersion: 1,
      promptName: 'business_analysis',
      promptVersion: 'v1.0',
      promptHash: 'hash-abc',
      aiProvider: AiProviderName.CLAUDE,
      aiModel: 'claude-sonnet-5',
      inputHash: 'input-hash-1',
      status: PrismaAnalysisStatus.COMPLETED,
      brandBrief: { industry: 'Restaurant' },
      sentimentSummary: null,
      confidenceScore: 0.85,
      rawResponse: null,
      validationErrors: null,
      executionTimeMs: 4000,
      completedAt: new Date('2026-01-02T00:00:00Z'),
      promptTokens: 500,
      completionTokens: 300,
      totalTokens: 800,
      estimatedCost: 0.02,
      createdAt: new Date('2026-01-02T00:00:00Z'),
      ...overrides,
    };
  }

  describe('authentication', () => {
    it('rejects POST /leads/:id/business with no token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/business`)
        .send({});
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects GET /leads/:id/business with no token', async () => {
      const response = await request(app.getHttpServer()).get(`/leads/${LEAD_ID}/business`);
      expect(response.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    it('returns 403 for a Viewer on POST (lacks business:analyze)', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(403);
      expect(prismaMock.businessAnalysis.create).not.toHaveBeenCalled();
    });

    it('allows a Viewer on GET (leads:read is sufficient)', async () => {
      authenticateAs(viewer);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /leads/:id/business', () => {
    it('returns null when the lead has no analysis yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      // Nest sends an empty body for a `null` handler return (same as
      // `undefined`) — supertest parses that as `response.text === ''`
      // and `response.body === {}`, not a literal `null`.
      expect(response.text).toBe('');
    });

    it('returns the latest analysis when one exists', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysisRow());

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'analysis-1',
        status: 'completed',
        aiProvider: 'claude',
        confidenceScore: 0.85,
      });
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${UNKNOWN_LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });
  });

  describe('POST /leads/:id/business', () => {
    it('returns 200 with the cached analysis on a fingerprint match (cache hit) and never dispatches the AI call', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.business.findUnique.mockResolvedValue(business);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(null);
      prismaMock.businessAnalysis.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve(fakeAnalysisRow({ ...data, status: PrismaAnalysisStatus.COMPLETED })),
      );

      // First call: no prior analysis, so this is a cache miss — used only
      // to discover the real fingerprint hash the service computes for
      // `business`, so the second call's "latest completed" fixture can
      // match it exactly.
      const missResponse = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');
      expect(missResponse.status).toBe(202);
      const discoveredInputHash = prismaMock.businessAnalysis.create.mock.calls[0]![0].data
        .inputHash as string;

      jest.clearAllMocks();
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.business.findUnique.mockResolvedValue(business);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(
        fakeAnalysisRow({ inputHash: discoveredInputHash }),
      );

      const hitResponse = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(hitResponse.status).toBe(200);
      expect(hitResponse.body).toMatchObject({ id: 'analysis-1', status: 'completed' });
      expect(prismaMock.businessAnalysis.create).not.toHaveBeenCalled();
      expect(aiTextProviderMock.complete).not.toHaveBeenCalled();
    });

    it('returns 202 with a PENDING analysis on a cache miss (no prior analysis)', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.business.findUnique.mockResolvedValue(business);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(null);
      prismaMock.businessAnalysis.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve(
            fakeAnalysisRow({
              ...data,
              status: PrismaAnalysisStatus.PENDING,
              brandBrief: null,
              confidenceScore: null,
            }),
          ),
      );

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(202);
      expect(response.body).toMatchObject({ status: 'pending' });
      expect(prismaMock.businessAnalysis.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            status: PrismaAnalysisStatus.PENDING,
            promptName: 'business_analysis',
            promptVersion: 'v1.0',
          }),
        }),
      );
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${UNKNOWN_LEAD_ID}/business`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for a malformed (non-UUID) lead id', async () => {
      authenticateAs(salesRep);

      const response = await request(app.getHttpServer())
        .post('/leads/not-a-uuid/business')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(400);
      expect(prismaMock.lead.findUnique).not.toHaveBeenCalled();
    });
  });
});
