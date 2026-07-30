import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// Isolated in its own file/app instance deliberately: @nestjs/throttler's
// in-memory storage is shared across every request the app instance sees
// for the throttle window, so sharing discovery.e2e-spec.ts's `app` would
// make this test's outcome depend on how many POST /discovery-jobs calls
// happened in *other* tests earlier in that file — fragile, order-coupled
// test state. A dedicated app instance here means the only requests
// counted are the ones this file makes (Doc 22 audit finding #4).
describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    discoveryJob: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
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
  const clerkServiceMock = { verifyToken: jest.fn().mockResolvedValue({ sub: 'user_1' }) };

  beforeAll(async () => {
    prismaMock.teamMember.findUnique.mockResolvedValue({
      id: 'rep-1',
      clerkUserId: 'user_1',
      name: 'Jane Doe',
      email: 'jane@riznexia.com',
      role: 'SALES_EXECUTIVE',
    });
    prismaMock.discoveryJob.create.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      city: 'Karachi',
      category: 'restaurant',
      status: 'QUEUED',
      resultsCount: 0,
    });

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

  it('rejects the 11th POST /discovery-jobs within the window with 429 RATE_LIMITED', async () => {
    const send = () =>
      request(app.getHttpServer())
        .post('/discovery-jobs')
        .set('Authorization', 'Bearer valid.jwt')
        .send({ city: 'Karachi', categories: ['restaurant'] });

    // Sequential, not Promise.all — verifying a per-window counter behaves
    // correctly under ordered requests, not raw throughput.
    const responses = [];
    for (let i = 0; i < 11; i += 1) {
      responses.push(await send());
    }

    const statuses = responses.map((r) => r.status);
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(201));
    expect(statuses[10]).toBe(429);
    expect(responses[10]?.body.error.code).toBe('RATE_LIMITED');
  });

  it('does not rate-limit GET /health (well under the global 100/min default)', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
  });
});
