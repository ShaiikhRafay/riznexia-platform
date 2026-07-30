import type { Response } from 'express';
import { LayoutGenerationController } from './layout-generation.controller';
import type { LayoutGenerationService } from './layout-generation.service';

function fakeResponse(): { res: Response; status: jest.Mock } {
  const status = jest.fn();
  const res = { status } as unknown as Response;
  status.mockReturnValue(res);
  return { res, status };
}

describe('LayoutGenerationController', () => {
  let layoutGenerationService: { findLatestForLead: jest.Mock; generateLayoutForLead: jest.Mock };
  let controller: LayoutGenerationController;

  beforeEach(() => {
    layoutGenerationService = { findLatestForLead: jest.fn(), generateLayoutForLead: jest.fn() };
    controller = new LayoutGenerationController(
      layoutGenerationService as unknown as LayoutGenerationService,
    );
  });

  describe('getLatest', () => {
    it('delegates to LayoutGenerationService.findLatestForLead', async () => {
      layoutGenerationService.findLatestForLead.mockResolvedValue({ id: 'layout-1' });
      await expect(controller.getLatest('lead-1')).resolves.toEqual({ id: 'layout-1' });
      expect(layoutGenerationService.findLatestForLead).toHaveBeenCalledWith('lead-1');
    });

    it('resolves to null when no configuration exists yet', async () => {
      layoutGenerationService.findLatestForLead.mockResolvedValue(null);
      await expect(controller.getLatest('lead-1')).resolves.toBeNull();
    });
  });

  describe('generate', () => {
    it('responds 200 on a cache hit', async () => {
      layoutGenerationService.generateLayoutForLead.mockResolvedValue({
        configuration: { id: 'layout-1' },
        cacheHit: true,
      });
      const { res, status } = fakeResponse();

      const result = await controller.generate('lead-1', res);

      expect(status).toHaveBeenCalledWith(200);
      expect(result).toEqual({ id: 'layout-1' });
    });

    it('responds 201 on a cache miss (new layout persisted)', async () => {
      layoutGenerationService.generateLayoutForLead.mockResolvedValue({
        configuration: { id: 'layout-2' },
        cacheHit: false,
      });
      const { res, status } = fakeResponse();

      const result = await controller.generate('lead-1', res);

      expect(status).toHaveBeenCalledWith(201);
      expect(result).toEqual({ id: 'layout-2' });
      expect(layoutGenerationService.generateLayoutForLead).toHaveBeenCalledWith('lead-1');
    });
  });
});
