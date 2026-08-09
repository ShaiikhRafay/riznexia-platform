import { ReportingController } from './reporting.controller';
import type { ReportingService } from './reporting.service';

describe('ReportingController', () => {
  let reportingService: { getDashboardStats: jest.Mock };
  let controller: ReportingController;

  beforeEach(() => {
    reportingService = { getDashboardStats: jest.fn() };
    controller = new ReportingController(reportingService as unknown as ReportingService);
  });

  it('getDashboard delegates to ReportingService.getDashboardStats with the validated query', async () => {
    const query = { ownerId: 'rep-1' } as never;
    reportingService.getDashboardStats.mockResolvedValue({ generatedAt: 'now' });
    await controller.getDashboard(query);
    expect(reportingService.getDashboardStats).toHaveBeenCalledWith(query);
  });
});
