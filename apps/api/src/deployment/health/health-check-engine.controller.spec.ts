import { HealthCheckEngineController } from './health-check-engine.controller';
import type { HealthCheckEngineService } from './health-check-engine.service';

describe('HealthCheckEngineController', () => {
  let healthCheckEngineService: { listForDeployment: jest.Mock; triggerManualCheck: jest.Mock };
  let controller: HealthCheckEngineController;

  beforeEach(() => {
    healthCheckEngineService = { listForDeployment: jest.fn(), triggerManualCheck: jest.fn() };
    controller = new HealthCheckEngineController(
      healthCheckEngineService as unknown as HealthCheckEngineService,
    );
  });

  it('list delegates to HealthCheckEngineService.listForDeployment with the lead id, deployment id, and query', async () => {
    const query = { limit: 25 } as never;
    healthCheckEngineService.listForDeployment.mockResolvedValue({ items: [], nextCursor: null });
    await controller.list('lead-1', 'deployment-1', query);
    expect(healthCheckEngineService.listForDeployment).toHaveBeenCalledWith(
      'lead-1',
      'deployment-1',
      query,
    );
  });

  it('trigger delegates to HealthCheckEngineService.triggerManualCheck with the lead id and deployment id', async () => {
    healthCheckEngineService.triggerManualCheck.mockResolvedValue({ id: 'check-1' });
    await controller.trigger('lead-1', 'deployment-1');
    expect(healthCheckEngineService.triggerManualCheck).toHaveBeenCalledWith(
      'lead-1',
      'deployment-1',
    );
  });
});
