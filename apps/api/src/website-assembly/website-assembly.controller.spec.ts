import type { Response } from 'express';
import { WebsiteAssemblyController } from './website-assembly.controller';
import type { WebsiteAssemblyService } from './website-assembly.service';

function fakeResponse(): { res: Response; status: jest.Mock } {
  const status = jest.fn();
  const res = { status } as unknown as Response;
  status.mockReturnValue(res);
  return { res, status };
}

describe('WebsiteAssemblyController', () => {
  let websiteAssemblyService: { findLatestForLead: jest.Mock; assembleWebsiteForLead: jest.Mock };
  let controller: WebsiteAssemblyController;

  beforeEach(() => {
    websiteAssemblyService = { findLatestForLead: jest.fn(), assembleWebsiteForLead: jest.fn() };
    controller = new WebsiteAssemblyController(
      websiteAssemblyService as unknown as WebsiteAssemblyService,
    );
  });

  describe('getLatest', () => {
    it('delegates to WebsiteAssemblyService.findLatestForLead', async () => {
      websiteAssemblyService.findLatestForLead.mockResolvedValue({ id: 'website-1' });
      await expect(controller.getLatest('lead-1')).resolves.toEqual({ id: 'website-1' });
      expect(websiteAssemblyService.findLatestForLead).toHaveBeenCalledWith('lead-1');
    });

    it('resolves to null when no generated website exists yet', async () => {
      websiteAssemblyService.findLatestForLead.mockResolvedValue(null);
      await expect(controller.getLatest('lead-1')).resolves.toBeNull();
    });
  });

  describe('assemble', () => {
    it('responds 200 on a cache hit', async () => {
      websiteAssemblyService.assembleWebsiteForLead.mockResolvedValue({
        website: { id: 'website-1' },
        cacheHit: true,
      });
      const { res, status } = fakeResponse();

      const result = await controller.assemble('lead-1', res);

      expect(status).toHaveBeenCalledWith(200);
      expect(result).toEqual({ id: 'website-1' });
    });

    it('responds 201 on a cache miss (new website persisted)', async () => {
      websiteAssemblyService.assembleWebsiteForLead.mockResolvedValue({
        website: { id: 'website-2' },
        cacheHit: false,
      });
      const { res, status } = fakeResponse();

      const result = await controller.assemble('lead-1', res);

      expect(status).toHaveBeenCalledWith(201);
      expect(result).toEqual({ id: 'website-2' });
      expect(websiteAssemblyService.assembleWebsiteForLead).toHaveBeenCalledWith('lead-1');
    });
  });
});
