import { LeadActivityType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import { LeadNotFoundException } from '../common/exceptions/app.exception';
import { LeadActivityService } from './lead-activity.service';
import { LeadNotesService } from './lead-notes.service';

describe('LeadNotesService', () => {
  let prisma: {
    lead: { findUnique: jest.Mock };
    leadNote: { create: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let activityService: { record: jest.Mock };
  let service: LeadNotesService;

  beforeEach(() => {
    prisma = {
      lead: { findUnique: jest.fn() },
      leadNote: { create: jest.fn(), findMany: jest.fn() },
      // Callback-form transaction: hand the same mock back as `tx` so
      // assertions against `prisma.leadNote.create` etc. still work.
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    };
    activityService = { record: jest.fn().mockResolvedValue(undefined) };
    service = new LeadNotesService(
      prisma as unknown as PrismaClient,
      activityService as unknown as LeadActivityService,
    );
  });

  describe('create', () => {
    it('throws LeadNotFoundException for an unknown lead, without writing anything', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.create('missing', 'body', 'user-1')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
      expect(prisma.leadNote.create).not.toHaveBeenCalled();
      expect(activityService.record).not.toHaveBeenCalled();
    });

    it('creates the note and records a note_added activity in the same transaction', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      prisma.leadNote.create.mockResolvedValue({
        id: 'note-1',
        leadId: 'lead-1',
        authorId: 'user-1',
        body: 'Called, no answer',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await service.create('lead-1', 'Called, no answer', 'user-1');

      expect(prisma.leadNote.create).toHaveBeenCalledWith({
        data: { leadId: 'lead-1', body: 'Called, no answer', authorId: 'user-1' },
      });
      expect(activityService.record).toHaveBeenCalledWith(
        {
          leadId: 'lead-1',
          actorId: 'user-1',
          type: LeadActivityType.NOTE_ADDED,
          detail: { noteId: 'note-1' },
        },
        prisma,
      );
      expect(result).toMatchObject({ id: 'note-1', body: 'Called, no answer', authorId: 'user-1' });
    });
  });

  describe('listForLead', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.listForLead('missing', { limit: 25 })).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('orders newest-first and paginates', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      const row = (id: string) => ({
        id,
        leadId: 'lead-1',
        authorId: 'user-1',
        body: 'note',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      prisma.leadNote.findMany.mockResolvedValue([row('n1'), row('n2'), row('n3')]);

      const result = await service.listForLead('lead-1', { limit: 2 });

      expect(prisma.leadNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      );
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('n2');
    });
  });
});
