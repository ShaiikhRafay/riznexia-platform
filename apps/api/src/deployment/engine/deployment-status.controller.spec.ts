import { DeploymentStatusController } from './deployment-status.controller';
import type { DeploymentStatusService } from './deployment-status.service';

describe('DeploymentStatusController', () => {
  let deploymentStatusService: { getForLead: jest.Mock };
  let controller: DeploymentStatusController;

  beforeEach(() => {
    deploymentStatusService = { getForLead: jest.fn() };
    controller = new DeploymentStatusController(
      deploymentStatusService as unknown as DeploymentStatusService,
    );
  });

  it('get delegates to DeploymentStatusService.getForLead with the lead id', async () => {
    deploymentStatusService.getForLead.mockResolvedValue({ productionReady: false });
    await expect(controller.get('lead-1')).resolves.toEqual({ productionReady: false });
    expect(deploymentStatusService.getForLead).toHaveBeenCalledWith('lead-1');
  });
});
