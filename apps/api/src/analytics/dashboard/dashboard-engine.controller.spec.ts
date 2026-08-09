import { DashboardEngineController } from './dashboard-engine.controller';
import type { DashboardEngineService } from './dashboard-engine.service';

describe('DashboardEngineController', () => {
  let dashboardEngineService: { getDashboard: jest.Mock };
  let controller: DashboardEngineController;

  beforeEach(() => {
    dashboardEngineService = { getDashboard: jest.fn() };
    controller = new DashboardEngineController(
      dashboardEngineService as unknown as DashboardEngineService,
    );
  });

  it('get delegates to DashboardEngineService.getDashboard with the validated query', async () => {
    const query = { period: 'monthly' } as never;
    dashboardEngineService.getDashboard.mockResolvedValue({ generatedAt: 'now' });
    await controller.get(query);
    expect(dashboardEngineService.getDashboard).toHaveBeenCalledWith(query);
  });
});
