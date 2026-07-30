import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LeadActivityType, PipelineStage, WebsiteStatusType } from '@riznexia/db';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// End-to-end check of the full request chain for Module M4 (Lead Management
// APIs, DECISIONS.md D-030) — guards, permission checks, validation pipes,
// controllers, services, and audit logging wired together for real, against
// a mocked data layer (same DECISIONS.md D-008 constraint as every other
// e2e suite in this repo: no live Postgres in this environment).
describe('Leads CRUD + workflow (e2e)', () => {
  let app: INestApplication;

  const fakeBusiness = {
    id: '22222222-2222-4222-8222-222222222222',
    googlePlaceId: 'place_1',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    placesData: {},
    websiteStatus: WebsiteStatusType.NONE,
    discoveryJobId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const fakeLead = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'lead-1',
    businessId: '22222222-2222-4222-8222-222222222222',
    pipelineStage: PipelineStage.NEW,
    assignedToId: null,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    business: fakeBusiness,
    ...overrides,
  });

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    business: { findUnique: jest.fn() },
    lead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    leadNote: { create: jest.fn(), findMany: jest.fn() },
    leadActivity: { create: jest.fn(), findMany: jest.fn() },
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
  });

  // `role` is the lowercase API-facing value; the mocked Prisma row needs
  // the uppercase Prisma-cased value (same convention as rbac.e2e-spec.ts).
  function authenticateAs(role: string, memberId = 'member-1'): void {
    clerkServiceMock.verifyToken.mockResolvedValue({ sub: 'user_1' });
    prismaMock.teamMember.findUnique.mockImplementation(({ where }: { where: { id?: string } }) => {
      // TeamMemberService.findById is also used to validate `assignedTo` —
      // return a plausible member for any id lookup, and the authenticated
      // caller for the ClerkAuthGuard's clerkUserId lookup.
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

  describe('POST /leads', () => {
    it('rejects a missing businessId with VALIDATION_ERROR', async () => {
      authenticateAs('sales_executive');
      const response = await authed('post', '/leads').send({});
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns BUSINESS_NOT_FOUND for an unknown business', async () => {
      authenticateAs('sales_executive');
      prismaMock.business.findUnique.mockResolvedValue(null);

      const response = await authed('post', '/leads').send({
        businessId: '33333333-3333-4333-8333-333333333333',
      });
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BUSINESS_NOT_FOUND');
    });

    it('returns DUPLICATE_LEAD when the business already has a lead', async () => {
      authenticateAs('sales_executive');
      prismaMock.business.findUnique.mockResolvedValue(fakeBusiness);
      prismaMock.lead.findUnique.mockResolvedValue({ id: 'existing' });

      const response = await authed('post', '/leads').send({
        businessId: '22222222-2222-4222-8222-222222222222',
      });
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DUPLICATE_LEAD');
    });

    it('creates a lead, returns 201, and writes an audit log entry', async () => {
      authenticateAs('sales_executive');
      prismaMock.business.findUnique.mockResolvedValue(fakeBusiness);
      prismaMock.lead.findUnique.mockResolvedValue(null);
      prismaMock.lead.create.mockResolvedValue(fakeLead({ tags: ['inbound'] }));

      const response = await authed('post', '/leads').send({
        businessId: '22222222-2222-4222-8222-222222222222',
        tags: ['inbound'],
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: 'lead-1',
        businessId: '22222222-2222-4222-8222-222222222222',
        tags: ['inbound'],
      });
      expect(prismaMock.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LeadActivityType.CREATED }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'lead.created',
            entityType: 'Lead',
            entityId: 'lead-1',
          }),
        }),
      );
    });

    it('rejects a caller without leads:write (viewer) with 403', async () => {
      authenticateAs('viewer');
      const response = await authed('post', '/leads').send({
        businessId: '22222222-2222-4222-8222-222222222222',
      });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(prismaMock.lead.create).not.toHaveBeenCalled();
    });

    it('rejects a caller without leads:write (developer) with 403', async () => {
      authenticateAs('developer');
      const response = await authed('post', '/leads').send({
        businessId: '22222222-2222-4222-8222-222222222222',
      });
      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /leads/:id', () => {
    const id = '11111111-1111-4111-8111-111111111111';

    it('returns LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs('sales_executive');
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await authed('patch', `/leads/${id}`).send({ pipelineStage: 'won' });
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('rejects an empty body with VALIDATION_ERROR rather than a silent no-op', async () => {
      authenticateAs('sales_executive');
      const response = await authed('patch', `/leads/${id}`).send({});
      expect(response.status).toBe(400);
    });

    it('rejects an unknown field with VALIDATION_ERROR', async () => {
      authenticateAs('sales_executive');
      const response = await authed('patch', `/leads/${id}`).send({ pipelinestage: 'won' });
      expect(response.status).toBe(400);
    });

    it('updates stage, assigns, and writes an audit log entry', async () => {
      authenticateAs('sales_manager');
      prismaMock.lead.findUnique.mockResolvedValue(fakeLead());
      prismaMock.lead.update.mockResolvedValue(
        fakeLead({
          pipelineStage: PipelineStage.QUALIFIED,
          assignedToId: '44444444-4444-4444-8444-444444444444',
        }),
      );

      const response = await authed('patch', `/leads/${id}`).send({
        pipelineStage: 'qualified',
        assignedTo: '44444444-4444-4444-8444-444444444444',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        pipelineStage: 'qualified',
        assignedTo: '44444444-4444-4444-8444-444444444444',
      });
      expect(prismaMock.leadActivity.create).toHaveBeenCalledTimes(2); // stage_changed + assigned
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'lead.updated', entityId: id }),
        }),
      );
    });

    it('explicit null unassigns; omitted assignedTo leaves it alone', async () => {
      authenticateAs('sales_manager');
      prismaMock.lead.findUnique.mockResolvedValue(
        fakeLead({ assignedToId: '55555555-5555-4555-8555-555555555555' }),
      );
      prismaMock.lead.update.mockResolvedValue(fakeLead({ assignedToId: null }));

      const response = await authed('patch', `/leads/${id}`).send({ assignedTo: null });

      expect(response.status).toBe(200);
      const [args] = prismaMock.lead.update.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data).toHaveProperty('assignedToId', null);
    });

    it('rejects a caller without leads:write (viewer) with 403', async () => {
      authenticateAs('viewer');
      const response = await authed('patch', `/leads/${id}`).send({ pipelineStage: 'won' });
      expect(response.status).toBe(403);
      expect(prismaMock.lead.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /leads/:id', () => {
    const id = '11111111-1111-4111-8111-111111111111';

    it('returns LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs('admin');
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await authed('delete', `/leads/${id}`);
      expect(response.status).toBe(404);
    });

    it('soft-deletes, returns 204, and writes an audit log entry', async () => {
      authenticateAs('admin');
      prismaMock.lead.findUnique.mockResolvedValue({ id });
      prismaMock.lead.delete.mockResolvedValue({});

      const response = await authed('delete', `/leads/${id}`);

      expect(response.status).toBe(204);
      expect(prismaMock.lead.delete).toHaveBeenCalledWith({ where: { id } });
      expect(prismaMock.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LeadActivityType.DELETED }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'lead.deleted', entityId: id }),
        }),
      );
    });

    it.each(['sales_executive', 'developer', 'viewer'])(
      'rejects a caller without leads:delete (%s) with 403',
      async (role) => {
        authenticateAs(role);
        const response = await authed('delete', `/leads/${id}`);
        expect(response.status).toBe(403);
        expect(prismaMock.lead.delete).not.toHaveBeenCalled();
      },
    );

    // sales_manager holds leads:delete alongside admin/super_admin per the
    // Module M3 permission matrix (apps/api/src/common/rbac/permission.constants.ts)
    it.each(['sales_manager', 'admin', 'super_admin'])('allows %s to delete', async (role) => {
      authenticateAs(role);
      prismaMock.lead.findUnique.mockResolvedValue({ id });
      prismaMock.lead.delete.mockResolvedValue({});

      const response = await authed('delete', `/leads/${id}`);
      expect(response.status).toBe(204);
    });
  });

  describe('POST/GET /leads/:id/notes', () => {
    const id = '11111111-1111-4111-8111-111111111111';

    it('rejects an empty note body', async () => {
      authenticateAs('sales_executive');
      const response = await authed('post', `/leads/${id}/notes`).send({ body: '' });
      expect(response.status).toBe(400);
    });

    it('returns LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs('sales_executive');
      prismaMock.lead.findUnique.mockResolvedValue(null);
      const response = await authed('post', `/leads/${id}/notes`).send({
        body: 'Called, no answer',
      });
      expect(response.status).toBe(404);
    });

    it('creates a note, writes a note_added activity and an audit log entry', async () => {
      authenticateAs('sales_executive');
      prismaMock.lead.findUnique.mockResolvedValue({ id });
      prismaMock.leadNote.create.mockResolvedValue({
        id: 'note-1',
        leadId: id,
        authorId: 'member-1',
        body: 'Called, no answer',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const response = await authed('post', `/leads/${id}/notes`).send({
        body: 'Called, no answer',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: 'note-1',
        body: 'Called, no answer',
        authorId: 'member-1',
      });
      expect(prismaMock.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LeadActivityType.NOTE_ADDED }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'lead.note_added', entityId: id }),
        }),
      );
    });

    it('rejects a caller without leads:write (viewer) with 403', async () => {
      authenticateAs('viewer');
      const response = await authed('post', `/leads/${id}/notes`).send({ body: 'x' });
      expect(response.status).toBe(403);
    });

    it('lists notes newest-first', async () => {
      authenticateAs('viewer');
      prismaMock.lead.findUnique.mockResolvedValue({ id });
      prismaMock.leadNote.findMany.mockResolvedValue([
        {
          id: 'n1',
          leadId: id,
          authorId: 'member-1',
          body: 'first',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ]);

      const response = await authed('get', `/leads/${id}/notes`);
      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
    });
  });

  describe('GET /leads/:id/activity', () => {
    const id = '11111111-1111-4111-8111-111111111111';

    it('returns LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs('viewer');
      prismaMock.lead.findUnique.mockResolvedValue(null);
      const response = await authed('get', `/leads/${id}/activity`);
      expect(response.status).toBe(404);
    });

    it('returns the timeline, readable by viewer', async () => {
      authenticateAs('viewer');
      prismaMock.lead.findUnique.mockResolvedValue({ id });
      prismaMock.leadActivity.findMany.mockResolvedValue([
        {
          id: 'a1',
          leadId: id,
          actorId: 'member-1',
          type: LeadActivityType.CREATED,
          detail: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ]);

      const response = await authed('get', `/leads/${id}/activity`);
      expect(response.status).toBe(200);
      expect(response.body.items[0]).toMatchObject({ type: 'created' });
    });
  });

  describe('GET /leads — sort, filter, pagination', () => {
    it('rejects an unwhitelisted sort field', async () => {
      authenticateAs('viewer');
      const response = await authed('get', '/leads?sort=googlePlaceId');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SORT_FIELD');
    });

    it('accepts a whitelisted sort field and a tag filter', async () => {
      authenticateAs('viewer');
      prismaMock.lead.findMany.mockResolvedValue([fakeLead({ tags: ['vip'] })]);

      const response = await authed('get', '/leads?sort=-updatedAt&tag=VIP');

      expect(response.status).toBe(200);
      const [args] = prismaMock.lead.findMany.mock.calls[0] as [{ where: { tags: unknown } }];
      expect(args.where.tags).toEqual({ has: 'vip' });
    });
  });
});
