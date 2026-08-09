import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LeadActivityType, ProposalStatus, TaskPriority, TaskStatus } from '@riznexia/db';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// End-to-end check of the full request chain for Module M10 (Sales CRM) —
// all five engines (Pipeline/Task/Activity/Proposal/Reporting), their RBAC
// gating, and the proposal immutability trust boundary. Same DECISIONS.md
// D-008 constraint as every other e2e suite: no live Postgres in this
// environment, so the data layer is mocked.
describe('Sales CRM (e2e)', () => {
  let app: INestApplication;

  const LEAD_ID = '11111111-1111-4111-8111-111111111111';
  const STAGE_OPEN_ID = '22222222-2222-4222-8222-222222222222';
  const STAGE_LOST_ID = '33333333-3333-4333-8333-333333333333';
  const LOST_REASON_ID = '44444444-4444-4444-8444-444444444444';
  const OWNER_ID = '55555555-5555-4555-8555-555555555555';
  const TASK_ID = '66666666-6666-4666-8666-666666666666';
  const PROPOSAL_ID = '77777777-7777-4777-8777-777777777777';

  const fakeLeadCrm = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'leadcrm-1',
    leadId: LEAD_ID,
    stageId: STAGE_OPEN_ID,
    dealValueUsd: null,
    lostReasonId: null,
    ownerId: null,
    nextFollowUpAt: null,
    lastActivityAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn() },
    leadCRM: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    salesStage: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    lostReason: { findUnique: jest.fn(), findMany: jest.fn() },
    crmSettings: { findFirst: jest.fn() },
    crmTask: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    salesProposal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    leadActivity: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
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
    prismaMock.leadActivity.findMany.mockResolvedValue([]);
  });

  // Same helper as leads.e2e-spec.ts — reused verbatim so TeamMemberService
  // lookups (the authenticated caller, and any `ownerId`/`assignedToId`
  // validation target) both resolve to a plausible member.
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

  describe('Pipeline Engine', () => {
    it('GET /leads/:id/crm lazily creates a LeadCRM row for a lead with no CRM history', async () => {
      authenticateAs('sales_executive');
      prismaMock.leadCRM.findUnique.mockResolvedValue(null);
      prismaMock.lead.findUnique.mockResolvedValue({ id: LEAD_ID });
      prismaMock.crmSettings.findFirst.mockResolvedValue({ defaultStageId: STAGE_OPEN_ID });
      prismaMock.leadCRM.create.mockResolvedValue(fakeLeadCrm());

      const response = await authed('get', `/leads/${LEAD_ID}/crm`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ leadId: LEAD_ID, stageId: STAGE_OPEN_ID });
      expect(prismaMock.leadCRM.create).toHaveBeenCalledWith({
        data: { leadId: LEAD_ID, stageId: STAGE_OPEN_ID },
      });
    });

    it('POST /leads/:id/crm/stage into a lost stage without a lostReasonId returns LOST_REASON_REQUIRED', async () => {
      authenticateAs('sales_executive');
      prismaMock.leadCRM.findUnique.mockResolvedValue(fakeLeadCrm());
      prismaMock.salesStage.findUnique.mockResolvedValue({
        id: STAGE_LOST_ID,
        isLost: true,
        isWon: false,
      });

      const response = await authed('post', `/leads/${LEAD_ID}/crm/stage`).send({
        stageId: STAGE_LOST_ID,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('LOST_REASON_REQUIRED');
    });

    it('POST /leads/:id/crm/stage into a lost stage with a valid lostReasonId transitions and logs STAGE_CHANGED + an audit entry', async () => {
      authenticateAs('sales_executive');
      prismaMock.leadCRM.findUnique.mockResolvedValue(fakeLeadCrm());
      prismaMock.salesStage.findUnique.mockResolvedValue({
        id: STAGE_LOST_ID,
        isLost: true,
        isWon: false,
      });
      prismaMock.lostReason.findUnique.mockResolvedValue({ id: LOST_REASON_ID });
      prismaMock.leadCRM.update.mockResolvedValue(
        fakeLeadCrm({ stageId: STAGE_LOST_ID, lostReasonId: LOST_REASON_ID }),
      );

      const response = await authed('post', `/leads/${LEAD_ID}/crm/stage`).send({
        stageId: STAGE_LOST_ID,
        lostReasonId: LOST_REASON_ID,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ stageId: STAGE_LOST_ID, lostReasonId: LOST_REASON_ID });
      expect(prismaMock.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LeadActivityType.STAGE_CHANGED }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'crm.stage_changed', entityId: LEAD_ID }),
        }),
      );
    });

    it('POST /leads/:id/crm/owner is rejected for a caller with crm:manage but not crm:assign (sales_executive)', async () => {
      authenticateAs('sales_executive');
      const response = await authed('post', `/leads/${LEAD_ID}/crm/owner`).send({
        ownerId: OWNER_ID,
      });
      expect(response.status).toBe(403);
      expect(prismaMock.leadCRM.update).not.toHaveBeenCalled();
    });

    it('POST /leads/:id/crm/owner succeeds for a caller with crm:assign (admin) and logs ASSIGNED', async () => {
      authenticateAs('admin');
      prismaMock.leadCRM.findUnique.mockResolvedValue(fakeLeadCrm());
      prismaMock.leadCRM.update.mockResolvedValue(fakeLeadCrm({ ownerId: OWNER_ID }));

      const response = await authed('post', `/leads/${LEAD_ID}/crm/owner`).send({
        ownerId: OWNER_ID,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ ownerId: OWNER_ID });
      expect(prismaMock.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LeadActivityType.ASSIGNED }),
        }),
      );
    });

    it('GET /crm/stages is readable by every CRM role, including viewer-adjacent roles without crm:manage', async () => {
      authenticateAs('sales_executive');
      prismaMock.salesStage.findMany.mockResolvedValue([]);
      const response = await authed('get', '/crm/stages');
      expect(response.status).toBe(200);
    });
  });

  describe('Task Engine', () => {
    it('POST /leads/:id/tasks creates a task with createdById set to the caller', async () => {
      authenticateAs('sales_executive', 'member-9');
      prismaMock.lead.findUnique.mockResolvedValue({ id: LEAD_ID });
      prismaMock.crmTask.create.mockResolvedValue({
        id: TASK_ID,
        leadId: LEAD_ID,
        title: 'Follow up',
        description: null,
        dueDate: new Date('2026-08-10T00:00:00Z'),
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
        assignedToId: null,
        reminderAt: null,
        estimatedDurationMinutes: null,
        actualDurationMinutes: null,
        completedById: null,
        completedAt: null,
        createdById: 'member-9',
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      });

      const response = await authed('post', `/leads/${LEAD_ID}/tasks`).send({
        title: 'Follow up',
        dueDate: '2026-08-10T00:00:00.000Z',
        priority: 'medium',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: 'Follow up',
        priority: 'medium',
        status: 'pending',
        createdById: 'member-9',
      });
    });

    it('PATCH /crm/tasks/:id with status=completed stamps completedAt/completedById', async () => {
      authenticateAs('sales_manager', 'member-2');
      prismaMock.crmTask.findUnique.mockResolvedValue({
        id: TASK_ID,
        leadId: LEAD_ID,
        title: 'Follow up',
        description: null,
        dueDate: new Date('2026-08-10T00:00:00Z'),
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
        assignedToId: null,
        reminderAt: null,
        estimatedDurationMinutes: null,
        actualDurationMinutes: null,
        completedById: null,
        completedAt: null,
        createdById: null,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      });
      prismaMock.crmTask.update.mockResolvedValue({
        id: TASK_ID,
        leadId: LEAD_ID,
        title: 'Follow up',
        description: null,
        dueDate: new Date('2026-08-10T00:00:00Z'),
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.COMPLETED,
        assignedToId: null,
        reminderAt: null,
        estimatedDurationMinutes: null,
        actualDurationMinutes: null,
        completedById: 'member-2',
        completedAt: new Date('2026-08-05T00:00:00Z'),
        createdById: null,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-05T00:00:00Z'),
      });

      const response = await authed('patch', `/crm/tasks/${TASK_ID}`).send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'completed', completedById: 'member-2' });
      const [args] = prismaMock.crmTask.update.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data).toMatchObject({ status: 'COMPLETED', completedById: 'member-2' });
    });

    it('GET /crm/tasks is rejected for a caller without crm:view (developer)', async () => {
      authenticateAs('developer');
      const response = await authed('get', '/crm/tasks');
      expect(response.status).toBe(403);
    });
  });

  describe('Activity Engine', () => {
    it('POST /leads/:id/activity logs a manual call and returns 204', async () => {
      authenticateAs('sales_executive');
      prismaMock.leadCRM.findUnique.mockResolvedValue(fakeLeadCrm());
      prismaMock.leadCRM.update.mockResolvedValue(fakeLeadCrm({ lastActivityAt: new Date() }));

      const response = await authed('post', `/leads/${LEAD_ID}/activity`).send({
        type: 'call',
        note: 'Left voicemail',
      });

      expect(response.status).toBe(204);
      expect(prismaMock.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: LeadActivityType.CALL,
            detail: { note: 'Left voicemail' },
          }),
        }),
      );
      expect(prismaMock.leadCRM.update).toHaveBeenCalledWith({
        where: { leadId: LEAD_ID },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('rejects an activity type outside the four loggable ones with VALIDATION_ERROR', async () => {
      authenticateAs('sales_executive');
      const response = await authed('post', `/leads/${LEAD_ID}/activity`).send({
        type: 'website_generated',
      });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Proposal Engine', () => {
    it('POST /leads/:id/proposals creates version 1 for a lead with no prior proposals', async () => {
      authenticateAs('sales_executive', 'member-3');
      prismaMock.lead.findUnique.mockResolvedValue({ id: LEAD_ID });
      prismaMock.salesProposal.findFirst.mockResolvedValue(null);
      prismaMock.salesProposal.create.mockResolvedValue({
        id: PROPOSAL_ID,
        leadId: LEAD_ID,
        version: 1,
        content: 'Draft v1',
        status: ProposalStatus.DRAFT,
        sentAt: null,
        viewedAt: null,
        acceptedAt: null,
        rejectedAt: null,
        createdById: 'member-3',
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      });

      const response = await authed('post', `/leads/${LEAD_ID}/proposals`).send({
        content: 'Draft v1',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ version: 1, status: 'draft', content: 'Draft v1' });
    });

    it('PATCH .../:proposalId with status=sent_manually stamps sentAt and logs PROPOSAL_SENT', async () => {
      authenticateAs('sales_executive');
      const existing = {
        id: PROPOSAL_ID,
        leadId: LEAD_ID,
        version: 2,
        content: 'Draft v2',
        status: ProposalStatus.DRAFT,
        sentAt: null,
        viewedAt: null,
        acceptedAt: null,
        rejectedAt: null,
        createdById: null,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      };
      prismaMock.salesProposal.findUnique.mockResolvedValue(existing);
      prismaMock.leadCRM.findUnique.mockResolvedValue(fakeLeadCrm());
      prismaMock.leadCRM.update.mockResolvedValue(fakeLeadCrm());
      prismaMock.salesProposal.update.mockResolvedValue({
        ...existing,
        status: ProposalStatus.SENT_MANUALLY,
        sentAt: new Date(),
      });

      const response = await authed('patch', `/leads/${LEAD_ID}/proposals/${PROPOSAL_ID}`).send({
        status: 'sent_manually',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'sent_manually' });
      expect(prismaMock.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LeadActivityType.PROPOSAL_SENT }),
        }),
      );
    });

    // The immutability trust boundary (founder's Decision 7): the PATCH
    // schema has no `content` field at all, so a client attempting to
    // sneak a content rewrite through the status-update endpoint has it
    // silently stripped before it ever reaches the service — content
    // never appears in the update Prisma actually receives.
    it('PATCH .../:proposalId silently drops an injected content field — a version can never be edited through this endpoint', async () => {
      authenticateAs('sales_executive');
      const existing = {
        id: PROPOSAL_ID,
        leadId: LEAD_ID,
        version: 1,
        content: 'Original content',
        status: ProposalStatus.DRAFT,
        sentAt: null,
        viewedAt: null,
        acceptedAt: null,
        rejectedAt: null,
        createdById: null,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      };
      prismaMock.salesProposal.findUnique.mockResolvedValue(existing);
      prismaMock.salesProposal.update.mockResolvedValue({
        ...existing,
        status: ProposalStatus.ACCEPTED,
        acceptedAt: new Date(),
      });

      const response = await authed('patch', `/leads/${LEAD_ID}/proposals/${PROPOSAL_ID}`).send({
        status: 'accepted',
        content: 'attempted rewrite',
      });

      expect(response.status).toBe(200);
      const [args] = prismaMock.salesProposal.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(args.data).not.toHaveProperty('content');
      expect(args.data).toEqual({ status: 'ACCEPTED', acceptedAt: expect.any(Date) });
    });

    it('rejects an unsettable status (draft) with VALIDATION_ERROR — draft/edited are never client-settable', async () => {
      authenticateAs('sales_executive');
      const response = await authed('patch', `/leads/${LEAD_ID}/proposals/${PROPOSAL_ID}`).send({
        status: 'draft',
      });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Reporting Engine', () => {
    it('GET /crm/dashboard is rejected for a caller without crm:report (sales_executive)', async () => {
      authenticateAs('sales_executive');
      const response = await authed('get', '/crm/dashboard');
      expect(response.status).toBe(403);
      expect(prismaMock.leadCRM.findMany).not.toHaveBeenCalled();
    });

    it('GET /crm/dashboard succeeds for a caller with crm:report (sales_manager) and returns a well-shaped, empty-safe response', async () => {
      authenticateAs('sales_manager');
      prismaMock.leadCRM.findMany.mockResolvedValue([]);

      const response = await authed('get', '/crm/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        pipelineValueByStage: [],
        totalPipelineValueUsd: 0,
        conversionRatePercent: null,
        winRatePercent: null,
        averageSalesCycleDays: null,
        lostReasonsBreakdown: [],
        salesPerformanceByRep: [],
      });
    });
  });
});
