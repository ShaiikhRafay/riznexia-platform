import type { Response } from 'express';
import { ExportEngineController } from './export-engine.controller';
import type { ExportEngineService } from './export-engine.service';

describe('ExportEngineController', () => {
  let exportEngineService: { exportReport: jest.Mock };
  let controller: ExportEngineController;
  let res: { setHeader: jest.Mock };

  beforeEach(() => {
    exportEngineService = { exportReport: jest.fn() };
    controller = new ExportEngineController(exportEngineService as unknown as ExportEngineService);
    res = { setHeader: jest.fn() };
  });

  it('sets Content-Type/Content-Disposition and returns the CSV body', async () => {
    exportEngineService.exportReport.mockResolvedValue({
      filename: 'ai_cost-monthly-2026-08-07.csv',
      content: 'a,b\n1,2',
      contentType: 'text/csv',
    });

    const query = { format: 'csv', period: 'monthly' } as never;
    const result = await controller.export('ai_cost', query, res as unknown as Response);

    expect(exportEngineService.exportReport).toHaveBeenCalledWith('ai_cost', query);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="ai_cost-monthly-2026-08-07.csv"',
    );
    expect(result).toBe('a,b\n1,2');
  });
});
