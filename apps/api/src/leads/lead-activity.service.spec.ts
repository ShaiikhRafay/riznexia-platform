import { LeadActivityType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import { LeadNotFoundException } from '../common/exceptions/app.exception';
import { LeadActivityService } from './lead-activity.service';

describe('LeadActivityService', () => {
  let prisma: {
    leadActivity: { create: jest.Mock; findMany: jest.Mock };
    lead: { findUnique: jest.Mock };
  };
  let service: LeadActivityService;

  beforeEach(() => {
    prisma = {
      leadActivity: { create: jest.fn(), findMany: jest.fn() },
      lead: { findUnique: jest.fn().mockResolvedValue({ id: 'lead-1' }) },
    };
    service = new LeadActivityService(prisma as unknown as PrismaClient);
  });

  describe('record', () => {
    it('writes to the root client when no transaction client is passed', async () => {
      prisma.leadActivity.create.mockResolvedValue({});
      await service.record({ leadId: 'lead-1', actorId: 'user-1', type: LeadActivityType.CREATED });

      expect(prisma.leadActivity.create).toHaveBeenCalledWith({
        data: {
          leadId: 'lead-1',
          actorId: 'user-1',
          type: LeadActivityType.CREATED,
          detail: undefined,
        },
      });
    });

    it('writes to the transaction client when one is passed, not the root client', async () => {
      const tx = { leadActivity: { create: jest.fn().mockResolvedValue({}) } };
      await service.record(
        {
          leadId: 'lead-1',
          actorId: null,
          type: LeadActivityType.STAGE_CHANGED,
          detail: { from: 'new', to: 'qualified' },
        },
        tx as unknown as Parameters<LeadActivityService['record']>[1],
      );

      expect(tx.leadActivity.create).toHaveBeenCalledWith({
        data: {
          leadId: 'lead-1',
          actorId: null,
          type: LeadActivityType.STAGE_CHANGED,
          detail: { from: 'new', to: 'qualified' },
        },
      });
      expect(prisma.leadActivity.create).not.toHaveBeenCalled();
    });
  });

  describe('recordMany', () => {
    it('writes every entry and is a no-op for an empty list', async () => {
      prisma.leadActivity.create.mockResolvedValue({});
      await service.recordMany([]);
      expect(prisma.leadActivity.create).not.toHaveBeenCalled();

      await service.recordMany([
        { leadId: 'lead-1', actorId: 'user-1', type: LeadActivityType.ASSIGNED },
        { leadId: 'lead-1', actorId: 'user-1', type: LeadActivityType.TAGS_CHANGED },
      ]);
      expect(prisma.leadActivity.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('listForLead', () => {
    it('throws LeadNotFoundException for an unknown lead, without querying activity', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.listForLead('missing', { limit: 25 })).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
      expect(prisma.leadActivity.findMany).not.toHaveBeenCalled();
    });

    it('orders newest-first with id as a tiebreaker', async () => {
      prisma.leadActivity.findMany.mockResolvedValue([]);
      await service.listForLead('lead-1', { limit: 25 });

      expect(prisma.leadActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leadId: 'lead-1' },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('returns a nextCursor when more results exist than the page limit', async () => {
      const row = (id: string) => ({
        id,
        leadId: 'lead-1',
        actorId: null,
        type: LeadActivityType.CREATED,
        detail: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      prisma.leadActivity.findMany.mockResolvedValue([row('a1'), row('a2'), row('a3')]);

      const result = await service.listForLead('lead-1', { limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('a2');
    });

    it('maps a non-object detail (e.g. accidental array/primitive) to null rather than passing it through', async () => {
      prisma.leadActivity.findMany.mockResolvedValue([
        {
          id: 'a1',
          leadId: 'lead-1',
          actorId: null,
          type: LeadActivityType.CREATED,
          detail: 'not-an-object',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ]);

      const result = await service.listForLead('lead-1', { limit: 25 });
      expect(result.items[0]?.detail).toBeNull();
    });
  });
});
