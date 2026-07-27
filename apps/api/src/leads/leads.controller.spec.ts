import { NotFoundException } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import type { LeadsService } from './leads.service';

describe('LeadsController', () => {
  let leadsService: { findMany: jest.Mock; findById: jest.Mock };
  let controller: LeadsController;

  beforeEach(() => {
    leadsService = { findMany: jest.fn(), findById: jest.fn() };
    controller = new LeadsController(leadsService as unknown as LeadsService);
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
});
