import { Controller, Get, INestApplication, Module, Param, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { Audited } from '../src/common/decorators/audited.decorator';
import { MinRole } from '../src/common/decorators/min-role.decorator';
import { RequirePermissions } from '../src/common/decorators/permissions.decorator';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// A throwaway controller exercising every Module M3 mechanism (DECISIONS.md
// D-023) end-to-end through real HTTP requests — not wired into AppModule,
// so it never becomes part of the real API surface. This is the
// integration-level proof that ClerkAuthGuard -> RolesGuard -> MinRoleGuard
// -> PermissionsGuard -> AuditLogInterceptor actually compose correctly as
// a chain, which no single guard's unit test can show on its own.
@Controller('rbac-test')
class RbacTestController {
  @Get('any-role')
  anyRole(): { ok: true } {
    return { ok: true };
  }

  @Get('min-role')
  @MinRole('sales_manager')
  minRole(): { ok: true } {
    return { ok: true };
  }

  @Get('permission')
  @RequirePermissions('team:manage')
  permission(): { ok: true } {
    return { ok: true };
  }

  @Post('audited/:id')
  @RequirePermissions('team:manage')
  @Audited({ action: 'test.privileged_action', entityType: 'TestEntity' })
  audited(@Param('id') id: string): { id: string } {
    return { id };
  }
}

@Module({ controllers: [RbacTestController] })
class RbacTestModule {}

describe('RBAC (e2e) — Module M3', () => {
  let app: INestApplication;

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
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
    const moduleRef = await Test.createTestingModule({ imports: [AppModule, RbacTestModule] })
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
  });

  // `role` is the lowercase API-facing value (TeamRole from shared-types);
  // the mocked Prisma row needs the uppercase Prisma-cased value, since
  // TeamMemberService.toRequestUser() runs it through toApiRole() — same as
  // a real `team_member.role` column read would.
  function authenticateAs(role: string): void {
    clerkServiceMock.verifyToken.mockResolvedValue({ sub: 'user_1' });
    prismaMock.teamMember.findUnique.mockResolvedValue({
      id: 'member-1',
      clerkUserId: 'user_1',
      name: 'Test User',
      email: 'test@riznexia.com',
      role: role.toUpperCase(),
    });
  }

  function get(path: string): request.Test {
    return request(app.getHttpServer()).get(path).set('Authorization', 'Bearer valid.jwt');
  }

  describe('ClerkAuthGuard (unchanged by M3)', () => {
    it('rejects a request with no token before any role/permission check runs', async () => {
      const response = await request(app.getHttpServer()).get('/rbac-test/any-role');
      expect(response.status).toBe(401);
    });
  });

  describe('no decorator — any authenticated role', () => {
    it.each(['super_admin', 'admin', 'sales_manager', 'developer', 'sales_executive', 'viewer'])(
      'allows role %s through',
      async (role) => {
        authenticateAs(role);
        const response = await get('/rbac-test/any-role');
        expect(response.status).toBe(200);
      },
    );
  });

  describe("@MinRole('sales_manager') — hierarchy threshold", () => {
    it.each(['super_admin', 'admin', 'sales_manager'])(
      'allows %s (meets the threshold)',
      async (role) => {
        authenticateAs(role);
        const response = await get('/rbac-test/min-role');
        expect(response.status).toBe(200);
      },
    );

    it.each(['developer', 'sales_executive', 'viewer'])(
      'rejects %s with 403 (below the threshold)',
      async (role) => {
        authenticateAs(role);
        const response = await get('/rbac-test/min-role');
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('FORBIDDEN');
      },
    );

    it('rejects developer even though its hierarchy level exceeds sales_executive', async () => {
      authenticateAs('developer');
      const response = await get('/rbac-test/min-role');
      expect(response.status).toBe(403);
    });
  });

  describe("@RequirePermissions('team:manage') — fine-grained permission", () => {
    it.each(['super_admin', 'admin', 'sales_manager'])(
      'allows %s (has the permission)',
      async (role) => {
        authenticateAs(role);
        const response = await get('/rbac-test/permission');
        expect(response.status).toBe(200);
      },
    );

    it.each(['developer', 'sales_executive', 'viewer'])(
      'rejects %s with 403 (lacks the permission)',
      async (role) => {
        authenticateAs(role);
        const response = await get('/rbac-test/permission');
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('FORBIDDEN');
      },
    );
  });

  describe('@Audited() — writes an audit log entry only on success', () => {
    it('records the privileged action after a successful call', async () => {
      authenticateAs('admin');
      const response = await request(app.getHttpServer())
        .post('/rbac-test/audited/entity-123')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(201);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'member-1',
          action: 'test.privileged_action',
          entityType: 'TestEntity',
          entityId: 'entity-123',
          metadata: undefined,
          ipAddress: expect.any(String),
        },
      });
    });

    it('never calls the audit log when the permission check rejects the request first', async () => {
      authenticateAs('viewer');
      const response = await request(app.getHttpServer())
        .post('/rbac-test/audited/entity-123')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(403);
      expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
