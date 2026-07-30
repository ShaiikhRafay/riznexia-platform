import type { Response } from 'express';
import { ThemeSelectionController } from './theme-selection.controller';
import type { ThemeSelectionService } from './theme-selection.service';

function fakeResponse(): { res: Response; status: jest.Mock } {
  const status = jest.fn();
  const res = { status } as unknown as Response;
  status.mockReturnValue(res);
  return { res, status };
}

describe('ThemeSelectionController', () => {
  let themeSelectionService: { findLatestForLead: jest.Mock; selectTheme: jest.Mock };
  let controller: ThemeSelectionController;

  beforeEach(() => {
    themeSelectionService = { findLatestForLead: jest.fn(), selectTheme: jest.fn() };
    controller = new ThemeSelectionController(
      themeSelectionService as unknown as ThemeSelectionService,
    );
  });

  describe('getLatest', () => {
    it('delegates to ThemeSelectionService.findLatestForLead', async () => {
      themeSelectionService.findLatestForLead.mockResolvedValue({ id: 'config-1' });
      await expect(controller.getLatest('lead-1')).resolves.toEqual({ id: 'config-1' });
      expect(themeSelectionService.findLatestForLead).toHaveBeenCalledWith('lead-1');
    });

    it('resolves to null when no configuration exists yet', async () => {
      themeSelectionService.findLatestForLead.mockResolvedValue(null);
      await expect(controller.getLatest('lead-1')).resolves.toBeNull();
    });
  });

  describe('select', () => {
    it('responds 200 on a cache hit', async () => {
      themeSelectionService.selectTheme.mockResolvedValue({
        configuration: { id: 'config-1' },
        cacheHit: true,
      });
      const { res, status } = fakeResponse();

      const result = await controller.select('lead-1', res);

      expect(status).toHaveBeenCalledWith(200);
      expect(result).toEqual({ id: 'config-1' });
    });

    it('responds 201 on a cache miss (new selection persisted)', async () => {
      themeSelectionService.selectTheme.mockResolvedValue({
        configuration: { id: 'config-2' },
        cacheHit: false,
      });
      const { res, status } = fakeResponse();

      const result = await controller.select('lead-1', res);

      expect(status).toHaveBeenCalledWith(201);
      expect(result).toEqual({ id: 'config-2' });
      expect(themeSelectionService.selectTheme).toHaveBeenCalledWith('lead-1');
    });
  });
});
