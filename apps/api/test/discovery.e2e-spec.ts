import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DiscoveryJobStatus, PipelineStage, WebsiteStatusType } from '@riznexia/db';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PlacesAdapter } from '../src/common/adapters/places.adapter';
import { WebsiteFetchAdapter } from '../src/common/adapters/website-fetch.adapter';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ClerkService } from '../src/auth/clerk.service';

// End-to-end check of the full request chain for Module M1 — guards,
// validation pipes, controllers, services, and the (mocked) data layer
// wired together for real. Doc 22's design review, applied.
//
// DECISIONS.md D-008: this environment has no Docker/live Postgres or
// Redis, so PRISMA_CLIENT and REDIS_CACHE are mocked at the DI boundary
// (same pattern as apps/api/test/app.e2e-spec.ts from Module M0) — this
// validates wiring, auth, and business-logic branching, not real SQL or
// real cache behavior. CI's ephemeral Postgres is the remaining
// verification step (Doc 14 §3, Doc 13 §6).
describe('Discovery + Leads (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    discoveryJob: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    lead: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    costEvent: { create: jest.fn() },
  };
  const cacheMock = {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn(),
    getOrSetJson: jest.fn(async (_key: string, _ttl: number, compute: () => Promise<unknown>) =>
      compute(),
    ),
    incrementCounter: jest.fn().mockResolvedValue(0),
    getCounter: jest.fn().mockResolvedValue(0),
    delete: jest.fn(),
  };
  const clerkServiceMock = { verifyToken: jest.fn() };
  const placesAdapterMock = {
    searchText: jest.fn().mockResolvedValue([]),
    getWebsiteUri: jest.fn(),
    getFullDetails: jest.fn(),
  };
  const websiteFetchAdapterMock = { fetch: jest.fn() };

  const salesRep = {
    id: 'rep-1',
    clerkUserId: 'user_1',
    name: 'Jane Doe',
    email: 'jane@riznexia.com',
    role: 'SALES_REP',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(prismaMock)
      .overrideProvider(REDIS_CACHE)
      .useValue(cacheMock)
      .overrideProvider(ClerkService)
      .useValue(clerkServiceMock)
      .overrideProvider(PlacesAdapter)
      .useValue(placesAdapterMock)
      .overrideProvider(WebsiteFetchAdapter)
      .useValue(websiteFetchAdapterMock)
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
    cacheMock.getJson.mockResolvedValue(null);
    cacheMock.getOrSetJson.mockImplementation(
      async (_key: string, _ttl: number, compute: () => Promise<unknown>) => compute(),
    );
    cacheMock.incrementCounter.mockResolvedValue(0);
    cacheMock.getCounter.mockResolvedValue(0);
  });

  function authenticateAs(member: typeof salesRep): void {
    clerkServiceMock.verifyToken.mockResolvedValue({ sub: member.clerkUserId });
    prismaMock.teamMember.findUnique.mockResolvedValue(member);
  }

  describe('authentication', () => {
    it('rejects POST /discovery-jobs with no token', async () => {
      const response = await request(app.getHttpServer())
        .post('/discovery-jobs')
        .send({ city: 'Karachi', categories: ['restaurant'] });
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects GET /leads with no token', async () => {
      const response = await request(app.getHttpServer()).get('/leads');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /discovery-jobs', () => {
    it('rejects an empty categories array with a VALIDATION_ERROR envelope', async () => {
      authenticateAs(salesRep);
      const response = await request(app.getHttpServer())
        .post('/discovery-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ city: 'Karachi', categories: [] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a request missing the required city field', async () => {
      authenticateAs(salesRep);
      const response = await request(app.getHttpServer())
        .post('/discovery-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ categories: ['restaurant'] });
      expect(response.status).toBe(400);
    });

    it('creates one job per requested category and returns 201', async () => {
      authenticateAs(salesRep);
      prismaMock.discoveryJob.create
        .mockResolvedValueOnce({
          id: 'job-1',
          city: 'Karachi',
          category: 'restaurant',
          status: DiscoveryJobStatus.QUEUED,
          resultsCount: 0,
        })
        .mockResolvedValueOnce({
          id: 'job-2',
          city: 'Karachi',
          category: 'cafe',
          status: DiscoveryJobStatus.QUEUED,
          resultsCount: 0,
        });
      prismaMock.discoveryJob.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/discovery-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ city: 'Karachi', categories: ['restaurant', 'cafe'] });

      expect(response.status).toBe(201);
      expect(response.body).toEqual([
        { id: 'job-1', city: 'Karachi', category: 'restaurant', status: 'queued', resultsCount: 0 },
        { id: 'job-2', city: 'Karachi', category: 'cafe', status: 'queued', resultsCount: 0 },
      ]);
    });

    it('returns 429 QUOTA_EXCEEDED when the monthly ceiling has been reached', async () => {
      authenticateAs(salesRep);
      cacheMock.getCounter.mockResolvedValue(300); // at the $300 default ceiling

      const response = await request(app.getHttpServer())
        .post('/discovery-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ city: 'Karachi', categories: ['restaurant'] });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('QUOTA_EXCEEDED');
      expect(prismaMock.discoveryJob.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /discovery-jobs/:id', () => {
    it('returns 404 for an unknown job', async () => {
      authenticateAs(salesRep);
      prismaMock.discoveryJob.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/discovery-jobs/missing-id')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('returns the job when found', async () => {
      authenticateAs(salesRep);
      prismaMock.discoveryJob.findUnique.mockResolvedValue({
        id: 'job-1',
        city: 'Karachi',
        category: 'restaurant',
        status: DiscoveryJobStatus.COMPLETED,
        resultsCount: 7,
      });

      const response = await request(app.getHttpServer())
        .get('/discovery-jobs/job-1')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 'job-1',
        city: 'Karachi',
        category: 'restaurant',
        status: 'completed',
        resultsCount: 7,
      });
    });
  });

  describe('GET /leads', () => {
    it('returns a paginated, mapped list', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findMany.mockResolvedValue([
        {
          id: 'lead-1',
          googlePlaceId: 'place_1',
          businessName: "Joe's Diner",
          category: 'restaurant',
          city: 'Karachi',
          address: '123 Main St',
          placesData: {},
          websiteStatus: WebsiteStatusType.OUTDATED,
          pipelineStage: PipelineStage.NEW,
          assignedToId: null,
          notes: null,
          discoveryJobId: 'job-1',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          deletedAt: null,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        id: 'lead-1',
        businessName: "Joe's Diner",
        websiteStatus: 'outdated',
        pipelineStage: 'new',
      });
      // internal-only fields never leak into the API response
      expect(response.body.items[0]).not.toHaveProperty('googlePlaceId');
      expect(response.body.items[0]).not.toHaveProperty('placesData');
    });

    it('rejects an out-of-range limit query param', async () => {
      authenticateAs(salesRep);
      const response = await request(app.getHttpServer())
        .get('/leads?limit=500')
        .set('Authorization', 'Bearer valid.jwt');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /leads/:id', () => {
    it('returns 404 for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/leads/missing')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
    });
  });
});
