import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BusinessSourceProvider, PlaceSyncJobStatus } from '@riznexia/db';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PlacesAdapter } from '../src/common/adapters/places.adapter';
import { WebsiteFetchAdapter } from '../src/common/adapters/website-fetch.adapter';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ClerkService } from '../src/auth/clerk.service';

// End-to-end check of the full request chain for Module M5 — guards,
// validation pipes, controllers, services, and the (mocked) data layer
// wired together for real, same pattern and same DECISIONS.md D-008
// rationale as test/discovery.e2e-spec.ts.
describe('Place Sync (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    discoveryJob: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    placeSyncJob: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    business: { findUnique: jest.fn(), upsert: jest.fn() },
    lead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    leadNote: { create: jest.fn(), findMany: jest.fn() },
    leadActivity: { create: jest.fn(), findMany: jest.fn() },
    costEvent: { create: jest.fn() },
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prismaMock)
        : Promise.all(arg as Promise<unknown>[]),
    ),
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
    searchText: jest.fn().mockResolvedValue({ candidates: [], nextPageToken: undefined }),
    searchNearby: jest.fn().mockResolvedValue({ candidates: [], nextPageToken: undefined }),
    getWebsiteUri: jest.fn(),
    getFullDetails: jest.fn(),
  };
  const websiteFetchAdapterMock = { fetch: jest.fn() };

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

  function fakeJobRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'sync-job-1',
      createdById: 'rep-1',
      provider: BusinessSourceProvider.GOOGLE,
      city: 'Karachi',
      category: 'restaurant',
      keyword: null,
      latitude: null,
      longitude: null,
      radiusMeters: 15000,
      status: PlaceSyncJobStatus.QUEUED,
      startedAt: null,
      finishedAt: null,
      duration: null,
      successRate: null,
      apiCallsUsed: 0,
      estimatedCost: 0,
      businessesFound: 0,
      businessesCreated: 0,
      businessesUpdated: 0,
      businessesFailed: 0,
      errorMessage: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    };
  }

  describe('authentication', () => {
    it('rejects POST /place-sync-jobs with no token', async () => {
      const response = await request(app.getHttpServer())
        .post('/place-sync-jobs')
        .send({ city: 'Karachi', category: 'restaurant' });
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('POST /place-sync-jobs', () => {
    it('rejects a body with neither city nor coordinates', async () => {
      authenticateAs(salesRep);
      const response = await request(app.getHttpServer())
        .post('/place-sync-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ category: 'restaurant' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(prismaMock.placeSyncJob.create).not.toHaveBeenCalled();
    });

    it('rejects a city search with neither category nor keyword', async () => {
      authenticateAs(salesRep);
      const response = await request(app.getHttpServer())
        .post('/place-sync-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ city: 'Karachi' });

      expect(response.status).toBe(400);
    });

    it('creates a QUEUED job and returns 201 for a valid city+category search', async () => {
      authenticateAs(salesRep);
      prismaMock.placeSyncJob.create.mockResolvedValue(fakeJobRow());
      prismaMock.placeSyncJob.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/place-sync-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ city: 'Karachi', category: 'restaurant' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: 'sync-job-1',
        status: 'queued',
        provider: 'google',
      });
    });

    it('accepts a coordinates-only search (no city)', async () => {
      authenticateAs(salesRep);
      prismaMock.placeSyncJob.create.mockResolvedValue(
        fakeJobRow({ city: null, latitude: 24.86, longitude: 67.01 }),
      );
      prismaMock.placeSyncJob.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/place-sync-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ latitude: 24.86, longitude: 67.01, radiusMeters: 5000 });

      expect(response.status).toBe(201);
      expect(response.body.latitude).toBe(24.86);
    });

    it('returns 403 for a Viewer (lacks discovery:run)', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .post('/place-sync-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ city: 'Karachi', category: 'restaurant' });

      expect(response.status).toBe(403);
      expect(prismaMock.placeSyncJob.create).not.toHaveBeenCalled();
    });

    it('returns 429 QUOTA_EXCEEDED when the monthly ceiling has been reached', async () => {
      authenticateAs(salesRep);
      cacheMock.getCounter.mockResolvedValue(300);

      const response = await request(app.getHttpServer())
        .post('/place-sync-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ city: 'Karachi', category: 'restaurant' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('QUOTA_EXCEEDED');
      expect(prismaMock.placeSyncJob.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /place-sync-jobs/:id', () => {
    it('returns 404 for a well-formed but unknown job id', async () => {
      authenticateAs(salesRep);
      prismaMock.placeSyncJob.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/place-sync-jobs/22222222-2222-4222-8222-222222222222')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PLACE_SYNC_JOB_NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for a malformed (non-UUID) id, without touching the DB', async () => {
      authenticateAs(salesRep);

      const response = await request(app.getHttpServer())
        .get('/place-sync-jobs/not-a-uuid')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(400);
      expect(prismaMock.placeSyncJob.findUnique).not.toHaveBeenCalled();
    });

    it('returns progress + cost fields when the job is found', async () => {
      authenticateAs(salesRep);
      const jobId = '33333333-3333-4333-8333-333333333333';
      prismaMock.placeSyncJob.findUnique.mockResolvedValue(
        fakeJobRow({
          id: jobId,
          status: PlaceSyncJobStatus.COMPLETED,
          businessesFound: 5,
          businessesCreated: 3,
          businessesUpdated: 2,
          apiCallsUsed: 8,
          estimatedCost: 0.24,
          successRate: 1,
        }),
      );

      const response = await request(app.getHttpServer())
        .get(`/place-sync-jobs/${jobId}`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: jobId,
        status: 'completed',
        businessesFound: 5,
        businessesCreated: 3,
        businessesUpdated: 2,
        apiCallsUsed: 8,
        estimatedCost: 0.24,
        successRate: 1,
      });
    });
  });

  describe('GET /place-sync-jobs', () => {
    it('returns a mapped list, newest first', async () => {
      authenticateAs(salesRep);
      prismaMock.placeSyncJob.findMany.mockResolvedValue([fakeJobRow()]);

      const response = await request(app.getHttpServer())
        .get('/place-sync-jobs')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ id: 'sync-job-1', status: 'queued' });
    });
  });
});
