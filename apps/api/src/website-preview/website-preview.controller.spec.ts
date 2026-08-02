import { WebsitePreviewController } from './website-preview.controller';
import type { WebsitePreviewService } from './website-preview.service';

describe('WebsitePreviewController', () => {
  let websitePreviewService: {
    getPreview: jest.Mock;
    getValidationReport: jest.Mock;
    getReadinessReport: jest.Mock;
  };
  let controller: WebsitePreviewController;

  beforeEach(() => {
    websitePreviewService = {
      getPreview: jest.fn(),
      getValidationReport: jest.fn(),
      getReadinessReport: jest.fn(),
    };
    controller = new WebsitePreviewController(
      websitePreviewService as unknown as WebsitePreviewService,
    );
  });

  describe('getPreview', () => {
    it('delegates to WebsitePreviewService.getPreview', async () => {
      websitePreviewService.getPreview.mockResolvedValue({ id: 'preview-1' });
      await expect(controller.getPreview('lead-1')).resolves.toEqual({ id: 'preview-1' });
      expect(websitePreviewService.getPreview).toHaveBeenCalledWith('lead-1');
    });
  });

  describe('getValidationReport', () => {
    it('delegates to WebsitePreviewService.getValidationReport', async () => {
      websitePreviewService.getValidationReport.mockResolvedValue({ id: 'report-1' });
      await expect(controller.getValidationReport('lead-1')).resolves.toEqual({ id: 'report-1' });
      expect(websitePreviewService.getValidationReport).toHaveBeenCalledWith('lead-1');
    });
  });

  describe('getReadinessReport', () => {
    it('delegates to WebsitePreviewService.getReadinessReport', async () => {
      websitePreviewService.getReadinessReport.mockResolvedValue({ id: 'readiness-1' });
      await expect(controller.getReadinessReport('lead-1')).resolves.toEqual({ id: 'readiness-1' });
      expect(websitePreviewService.getReadinessReport).toHaveBeenCalledWith('lead-1');
    });
  });
});
