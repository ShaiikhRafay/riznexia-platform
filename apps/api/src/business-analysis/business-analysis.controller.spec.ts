import type { Response } from 'express';
import { BusinessAnalysisController } from './business-analysis.controller';
import type { BusinessAnalysisService } from './business-analysis.service';

function fakeResponse(): { res: Response; status: jest.Mock } {
  const status = jest.fn();
  const res = { status } as unknown as Response;
  status.mockReturnValue(res);
  return { res, status };
}

describe('BusinessAnalysisController', () => {
  let businessAnalysisService: { findLatestForLead: jest.Mock; triggerAnalysis: jest.Mock };
  let controller: BusinessAnalysisController;

  beforeEach(() => {
    businessAnalysisService = { findLatestForLead: jest.fn(), triggerAnalysis: jest.fn() };
    controller = new BusinessAnalysisController(
      businessAnalysisService as unknown as BusinessAnalysisService,
    );
  });

  describe('getLatest', () => {
    it('delegates to BusinessAnalysisService.findLatestForLead', async () => {
      businessAnalysisService.findLatestForLead.mockResolvedValue({ id: 'analysis-1' });
      await expect(controller.getLatest('lead-1')).resolves.toEqual({ id: 'analysis-1' });
      expect(businessAnalysisService.findLatestForLead).toHaveBeenCalledWith('lead-1');
    });

    it('resolves to null when no analysis exists yet', async () => {
      businessAnalysisService.findLatestForLead.mockResolvedValue(null);
      await expect(controller.getLatest('lead-1')).resolves.toBeNull();
    });
  });

  describe('trigger', () => {
    it('responds 200 on a cache hit', async () => {
      businessAnalysisService.triggerAnalysis.mockResolvedValue({
        analysis: { id: 'analysis-1', status: 'completed' },
        cacheHit: true,
      });
      const { res, status } = fakeResponse();

      const result = await controller.trigger('lead-1', res);

      expect(status).toHaveBeenCalledWith(200);
      expect(result).toEqual({ id: 'analysis-1', status: 'completed' });
      expect(businessAnalysisService.triggerAnalysis).toHaveBeenCalledWith('lead-1');
    });

    it('responds 202 on a cache miss', async () => {
      businessAnalysisService.triggerAnalysis.mockResolvedValue({
        analysis: { id: 'analysis-2', status: 'pending' },
        cacheHit: false,
      });
      const { res, status } = fakeResponse();

      const result = await controller.trigger('lead-1', res);

      expect(status).toHaveBeenCalledWith(202);
      expect(result).toEqual({ id: 'analysis-2', status: 'pending' });
    });
  });
});
