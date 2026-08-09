import type { PrismaClient } from '@riznexia/db';
import {
  CrmTaskNotFoundException,
  LeadNotFoundException,
  TeamMemberNotFoundException,
} from '../../common/exceptions/app.exception';
import type { TeamMemberService } from '../../auth/team-member.service';
import { CrmTaskService } from './crm-task.service';

function fakeTaskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    leadId: 'lead-1',
    title: 'Follow up',
    description: null,
    dueDate: new Date('2026-08-10T00:00:00.000Z'),
    priority: 'MEDIUM',
    status: 'PENDING',
    assignedToId: null,
    reminderAt: null,
    estimatedDurationMinutes: null,
    actualDurationMinutes: null,
    completedById: null,
    completedAt: null,
    createdById: 'actor-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CrmTaskService', () => {
  let prisma: {
    crmTask: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    lead: { findUnique: jest.Mock };
  };
  let teamMemberService: { findById: jest.Mock };
  let service: CrmTaskService;

  beforeEach(() => {
    prisma = {
      crmTask: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      lead: { findUnique: jest.fn().mockResolvedValue({ id: 'lead-1' }) },
    };
    teamMemberService = { findById: jest.fn() };
    service = new CrmTaskService(
      prisma as unknown as PrismaClient,
      teamMemberService as unknown as TeamMemberService,
    );
  });

  describe('listForLead', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.listForLead('missing', { limit: 25 })).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('filters by leadId and optional status', async () => {
      prisma.crmTask.findMany.mockResolvedValue([]);
      await service.listForLead('lead-1', { limit: 25, status: 'pending' });
      expect(prisma.crmTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { leadId: 'lead-1', status: 'PENDING' } }),
      );
    });

    it('paginates via a cursor and reports nextCursor when more rows exist than the limit', async () => {
      prisma.crmTask.findMany.mockResolvedValue([
        fakeTaskRow({ id: 'a' }),
        fakeTaskRow({ id: 'b' }),
      ]);
      const result = await service.listForLead('lead-1', { limit: 1 });
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe('a');
    });
  });

  describe('listAll', () => {
    it('applies assignedToId/status/dueBefore/dueAfter filters', async () => {
      prisma.crmTask.findMany.mockResolvedValue([]);
      await service.listAll({
        limit: 25,
        assignedToId: 'rep-1',
        status: 'in_progress',
        dueBefore: '2026-09-01T00:00:00.000Z',
        dueAfter: '2026-08-01T00:00:00.000Z',
      });
      expect(prisma.crmTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            assignedToId: 'rep-1',
            status: 'IN_PROGRESS',
            dueDate: {
              lte: new Date('2026-09-01T00:00:00.000Z'),
              gte: new Date('2026-08-01T00:00:00.000Z'),
            },
          },
        }),
      );
    });
  });

  describe('findByIdOrThrow', () => {
    it('throws CrmTaskNotFoundException for an unknown id', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(null);
      await expect(service.findByIdOrThrow('missing')).rejects.toBeInstanceOf(
        CrmTaskNotFoundException,
      );
    });

    it('returns the mapped task when found', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(fakeTaskRow());
      const result = await service.findByIdOrThrow('task-1');
      expect(result.id).toBe('task-1');
      expect(result.priority).toBe('medium');
      expect(result.status).toBe('pending');
    });
  });

  describe('create', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(
        service.create(
          'missing',
          { title: 'x', dueDate: '2026-08-10T00:00:00.000Z', priority: 'medium' },
          'actor-1',
        ),
      ).rejects.toBeInstanceOf(LeadNotFoundException);
    });

    it('throws TeamMemberNotFoundException for an unknown assignedToId', async () => {
      teamMemberService.findById.mockResolvedValue(null);
      await expect(
        service.create(
          'lead-1',
          {
            title: 'x',
            dueDate: '2026-08-10T00:00:00.000Z',
            priority: 'medium',
            assignedToId: 'missing',
          },
          'actor-1',
        ),
      ).rejects.toBeInstanceOf(TeamMemberNotFoundException);
    });

    it('creates a task with createdById set to the acting user', async () => {
      prisma.crmTask.create.mockResolvedValue(fakeTaskRow());
      await service.create(
        'lead-1',
        { title: 'Follow up', dueDate: '2026-08-10T00:00:00.000Z', priority: 'medium' },
        'actor-1',
      );
      expect(prisma.crmTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: 'lead-1',
          title: 'Follow up',
          priority: 'MEDIUM',
          createdById: 'actor-1',
        }),
      });
    });
  });

  describe('update', () => {
    it('throws CrmTaskNotFoundException when the task does not exist', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { title: 'x' }, 'actor-1')).rejects.toBeInstanceOf(
        CrmTaskNotFoundException,
      );
    });

    it('throws TeamMemberNotFoundException when reassigning to an unknown member', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(fakeTaskRow());
      teamMemberService.findById.mockResolvedValue(null);
      await expect(
        service.update('task-1', { assignedToId: 'missing' }, 'actor-1'),
      ).rejects.toBeInstanceOf(TeamMemberNotFoundException);
    });

    it('allows clearing assignedToId to null without validating a TeamMember', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(fakeTaskRow({ assignedToId: 'rep-1' }));
      prisma.crmTask.update.mockResolvedValue(fakeTaskRow({ assignedToId: null }));
      await service.update('task-1', { assignedToId: null }, 'actor-1');
      expect(teamMemberService.findById).not.toHaveBeenCalled();
      expect(prisma.crmTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { assignedToId: null },
      });
    });

    it('stamps completedAt/completedById when transitioning to completed', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(fakeTaskRow({ status: 'PENDING' }));
      prisma.crmTask.update.mockResolvedValue(fakeTaskRow({ status: 'COMPLETED' }));

      await service.update('task-1', { status: 'completed' }, 'actor-2');

      expect(prisma.crmTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'COMPLETED', completedAt: expect.any(Date), completedById: 'actor-2' },
      });
    });

    it('does not overwrite completedAt/completedById when re-PATCHing an already-completed task (idempotent)', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(
        fakeTaskRow({
          status: 'COMPLETED',
          completedAt: new Date('2026-08-01T00:00:00.000Z'),
          completedById: 'actor-1',
        }),
      );
      prisma.crmTask.update.mockResolvedValue(fakeTaskRow({ status: 'COMPLETED' }));

      await service.update('task-1', { status: 'completed' }, 'actor-2');

      expect(prisma.crmTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'COMPLETED' },
      });
    });

    it('clears completedAt/completedById when reopening a completed task', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(
        fakeTaskRow({ status: 'COMPLETED', completedAt: new Date(), completedById: 'actor-1' }),
      );
      prisma.crmTask.update.mockResolvedValue(fakeTaskRow({ status: 'IN_PROGRESS' }));

      await service.update('task-1', { status: 'in_progress' }, 'actor-2');

      expect(prisma.crmTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'IN_PROGRESS', completedAt: null, completedById: null },
      });
    });

    it('updates actualDurationMinutes directly without touching status', async () => {
      prisma.crmTask.findUnique.mockResolvedValue(fakeTaskRow());
      prisma.crmTask.update.mockResolvedValue(fakeTaskRow({ actualDurationMinutes: 45 }));

      await service.update('task-1', { actualDurationMinutes: 45 }, 'actor-1');

      expect(prisma.crmTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { actualDurationMinutes: 45 },
      });
    });
  });
});
