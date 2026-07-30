import { NotFoundException } from '@nestjs/common';
import type { RequestTeamMember } from '../auth/types/authenticated-request';
import { LeadsController } from './leads.controller';
import type { LeadActivityService } from './lead-activity.service';
import type { LeadNotesService } from './lead-notes.service';
import type { LeadsService } from './leads.service';

describe('LeadsController', () => {
  let leadsService: {
    findMany: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let leadNotesService: { create: jest.Mock; listForLead: jest.Mock };
  let leadActivityService: { listForLead: jest.Mock };
  let controller: LeadsController;

  const user: RequestTeamMember = { id: 'user-1', clerkUserId: 'clerk_1', role: 'sales_executive' };

  beforeEach(() => {
    leadsService = {
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    leadNotesService = { create: jest.fn(), listForLead: jest.fn() };
    leadActivityService = { listForLead: jest.fn() };
    controller = new LeadsController(
      leadsService as unknown as LeadsService,
      leadNotesService as unknown as LeadNotesService,
      leadActivityService as unknown as LeadActivityService,
    );
  });

  describe('list', () => {
    it('delegates to LeadsService.findMany with the validated query', async () => {
      leadsService.findMany.mockResolvedValue({ items: [], nextCursor: null });
      const query = { limit: 25 } as never;
      await controller.list(query);
      expect(leadsService.findMany).toHaveBeenCalledWith(query);
    });
  });

  describe('getById', () => {
    it('returns the lead when found', async () => {
      leadsService.findById.mockResolvedValue({ id: 'lead-1' });
      await expect(controller.getById('lead-1')).resolves.toEqual({ id: 'lead-1' });
    });

    it('throws NotFoundException when not found', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(controller.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('delegates to LeadsService.create with the current user as actor', async () => {
      leadsService.create.mockResolvedValue({ id: 'lead-1' });
      const body = { businessId: 'biz-1' } as never;

      await controller.create(body, user);

      expect(leadsService.create).toHaveBeenCalledWith(body, 'user-1');
    });
  });

  describe('update', () => {
    it('delegates to LeadsService.update with the current user as actor', async () => {
      leadsService.update.mockResolvedValue({ id: 'lead-1' });
      const body = { pipelineStage: 'won' } as never;

      await controller.update('lead-1', body, user);

      expect(leadsService.update).toHaveBeenCalledWith('lead-1', body, 'user-1');
    });
  });

  describe('softDelete', () => {
    it('delegates to LeadsService.softDelete with the current user as actor', async () => {
      leadsService.softDelete.mockResolvedValue(undefined);

      await controller.softDelete('lead-1', user);

      expect(leadsService.softDelete).toHaveBeenCalledWith('lead-1', 'user-1');
    });
  });

  describe('addNote', () => {
    it('delegates to LeadNotesService.create with the note body and current user as author', async () => {
      leadNotesService.create.mockResolvedValue({ id: 'note-1' });
      const body = { body: 'Called, no answer' } as never;

      await controller.addNote('lead-1', body, user);

      expect(leadNotesService.create).toHaveBeenCalledWith('lead-1', 'Called, no answer', 'user-1');
    });
  });

  describe('listNotes', () => {
    it('delegates to LeadNotesService.listForLead', async () => {
      leadNotesService.listForLead.mockResolvedValue({ items: [], nextCursor: null });
      const query = { limit: 25 } as never;

      await controller.listNotes('lead-1', query);

      expect(leadNotesService.listForLead).toHaveBeenCalledWith('lead-1', query);
    });
  });

  describe('listActivity', () => {
    it('delegates to LeadActivityService.listForLead', async () => {
      leadActivityService.listForLead.mockResolvedValue({ items: [], nextCursor: null });
      const query = { limit: 25 } as never;

      await controller.listActivity('lead-1', query);

      expect(leadActivityService.listForLead).toHaveBeenCalledWith('lead-1', query);
    });
  });
});
