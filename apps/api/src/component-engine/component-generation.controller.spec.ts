import type { Response } from 'express';
import { ComponentGenerationController } from './component-generation.controller';
import type { ComponentGenerationService } from './component-generation.service';

function fakeResponse(): { res: Response; status: jest.Mock } {
  const status = jest.fn();
  const res = { status } as unknown as Response;
  status.mockReturnValue(res);
  return { res, status };
}

describe('ComponentGenerationController', () => {
  let componentGenerationService: {
    findLatestForLead: jest.Mock;
    generateComponentManifestForLead: jest.Mock;
  };
  let controller: ComponentGenerationController;

  beforeEach(() => {
    componentGenerationService = {
      findLatestForLead: jest.fn(),
      generateComponentManifestForLead: jest.fn(),
    };
    controller = new ComponentGenerationController(
      componentGenerationService as unknown as ComponentGenerationService,
    );
  });

  describe('getLatest', () => {
    it('delegates to ComponentGenerationService.findLatestForLead', async () => {
      componentGenerationService.findLatestForLead.mockResolvedValue({ id: 'manifest-1' });
      await expect(controller.getLatest('lead-1')).resolves.toEqual({ id: 'manifest-1' });
      expect(componentGenerationService.findLatestForLead).toHaveBeenCalledWith('lead-1');
    });

    it('resolves to null when no manifest exists yet', async () => {
      componentGenerationService.findLatestForLead.mockResolvedValue(null);
      await expect(controller.getLatest('lead-1')).resolves.toBeNull();
    });
  });

  describe('generate', () => {
    it('responds 200 on a cache hit', async () => {
      componentGenerationService.generateComponentManifestForLead.mockResolvedValue({
        configuration: { id: 'manifest-1' },
        cacheHit: true,
      });
      const { res, status } = fakeResponse();

      const result = await controller.generate('lead-1', res);

      expect(status).toHaveBeenCalledWith(200);
      expect(result).toEqual({ id: 'manifest-1' });
    });

    it('responds 201 on a cache miss (new manifest persisted)', async () => {
      componentGenerationService.generateComponentManifestForLead.mockResolvedValue({
        configuration: { id: 'manifest-2' },
        cacheHit: false,
      });
      const { res, status } = fakeResponse();

      const result = await controller.generate('lead-1', res);

      expect(status).toHaveBeenCalledWith(201);
      expect(result).toEqual({ id: 'manifest-2' });
      expect(componentGenerationService.generateComponentManifestForLead).toHaveBeenCalledWith(
        'lead-1',
      );
    });
  });
});
