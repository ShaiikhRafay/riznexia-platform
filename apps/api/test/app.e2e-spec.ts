import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// End-to-end check that the full request chain — guards, decorators,
// controllers, exception filter — is actually wired together correctly
// (Doc 21, Module M0 DoD: "hit a protected /me endpoint, and see
// role-based access denied/allowed correctly"). Not exhaustive; the
// per-unit behavior is already covered by the guard/controller specs.
describe('AppModule (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    teamMember: {
      findUnique: jest.fn(),
    },
  };
  const clerkServiceMock = { verifyToken: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(prismaMock)
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
    jest.resetAllMocks();
  });

  it('GET /health is public and returns ok', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('GET /me without a token returns 401 UNAUTHENTICATED via the shared error envelope', async () => {
    const response = await request(app.getHttpServer()).get('/me').expect(401);
    expect(response.body).toEqual({
      error: { code: 'UNAUTHENTICATED', message: expect.any(String), details: {} },
    });
  });

  it('GET /me with a valid token for a known team member returns the profile', async () => {
    clerkServiceMock.verifyToken.mockResolvedValue({ sub: 'user_1' });
    const member = {
      id: 'id-1',
      clerkUserId: 'user_1',
      name: 'Jane Doe',
      email: 'jane@riznexia.com',
      role: 'ADMIN',
    };
    prismaMock.teamMember.findUnique.mockResolvedValue(member);

    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer valid.jwt')
      .expect(200);

    expect(response.body).toEqual({
      id: 'id-1',
      name: 'Jane Doe',
      email: 'jane@riznexia.com',
      role: 'admin',
    });
  });

  it('GET /me with a token for an unknown team member returns 401, not 500', async () => {
    clerkServiceMock.verifyToken.mockResolvedValue({ sub: 'user_ghost' });
    prismaMock.teamMember.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer valid.jwt')
      .expect(401);
  });
});
