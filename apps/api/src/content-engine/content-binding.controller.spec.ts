import type { Response } from 'express';
import { ContentBindingController } from './content-binding.controller';
import type { ContentBindingService } from './content-binding.service';

function fakeResponse(): { res: Response; status: jest.Mock } {
  const status = jest.fn();
  const res = { status } as unknown as Response;
  status.mockReturnValue(res);
  return { res, status };
}

describe('ContentBindingController', () => {
  let contentBindingService: { findLatestForLead: jest.Mock; bindContentForLead: jest.Mock };
  let controller: ContentBindingController;

  beforeEach(() => {
    contentBindingService = { findLatestForLead: jest.fn(), bindContentForLead: jest.fn() };
    controller = new ContentBindingController(
      contentBindingService as unknown as ContentBindingService,
    );
  });

  describe('getLatest', () => {
    it('delegates to ContentBindingService.findLatestForLead', async () => {
      contentBindingService.findLatestForLead.mockResolvedValue({ id: 'content-1' });
      await expect(controller.getLatest('lead-1')).resolves.toEqual({ id: 'content-1' });
      expect(contentBindingService.findLatestForLead).toHaveBeenCalledWith('lead-1');
    });

    it('resolves to null when no manifest exists yet', async () => {
      contentBindingService.findLatestForLead.mockResolvedValue(null);
      await expect(controller.getLatest('lead-1')).resolves.toBeNull();
    });
  });

  describe('bind', () => {
    it('responds 200 on a cache hit', async () => {
      contentBindingService.bindContentForLead.mockResolvedValue({
        configuration: { id: 'content-1' },
        cacheHit: true,
      });
      const { res, status } = fakeResponse();

      const result = await controller.bind('lead-1', res);

      expect(status).toHaveBeenCalledWith(200);
      expect(result).toEqual({ id: 'content-1' });
    });

    it('responds 201 on a cache miss (new manifest persisted)', async () => {
      contentBindingService.bindContentForLead.mockResolvedValue({
        configuration: { id: 'content-2' },
        cacheHit: false,
      });
      const { res, status } = fakeResponse();

      const result = await controller.bind('lead-1', res);

      expect(status).toHaveBeenCalledWith(201);
      expect(result).toEqual({ id: 'content-2' });
      expect(contentBindingService.bindContentForLead).toHaveBeenCalledWith('lead-1');
    });
  });
});
