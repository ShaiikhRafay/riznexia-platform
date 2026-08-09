import { ReportingEngineController } from './reporting-engine.controller';
import type { ReportingEngineService } from './reporting-engine.service';

describe('ReportingEngineController', () => {
  let reportingEngineService: { generateReport: jest.Mock };
  let controller: ReportingEngineController;

  beforeEach(() => {
    reportingEngineService = { generateReport: jest.fn() };
    controller = new ReportingEngineController(
      reportingEngineService as unknown as ReportingEngineService,
    );
  });

  it('get delegates to ReportingEngineService.generateReport with the validated type and query', async () => {
    const query = { period: 'monthly', limit: 25 } as never;
    reportingEngineService.generateReport.mockResolvedValue({ reportType: 'ai_cost' });
    await controller.get('ai_cost', query);
    expect(reportingEngineService.generateReport).toHaveBeenCalledWith('ai_cost', query);
  });
});
