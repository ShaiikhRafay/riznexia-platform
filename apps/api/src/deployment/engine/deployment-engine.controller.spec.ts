import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { DeploymentEngineController } from './deployment-engine.controller';
import type { DeploymentEngineService } from './deployment-engine.service';

describe('DeploymentEngineController', () => {
  let deploymentEngineService: {
    listForLead: jest.Mock;
    findByIdOrThrow: jest.Mock;
    requestDeployment: jest.Mock;
    retryDeployment: jest.Mock;
  };
  let controller: DeploymentEngineController;

  const user: RequestTeamMember = { id: 'user-1', clerkUserId: 'clerk_1', role: 'sales_executive' };

  beforeEach(() => {
    deploymentEngineService = {
      listForLead: jest.fn(),
      findByIdOrThrow: jest.fn(),
      requestDeployment: jest.fn(),
      retryDeployment: jest.fn(),
    };
    controller = new DeploymentEngineController(
      deploymentEngineService as unknown as DeploymentEngineService,
    );
  });

  it('list delegates to DeploymentEngineService.listForLead with the lead id and query', async () => {
    const query = { limit: 25 } as never;
    deploymentEngineService.listForLead.mockResolvedValue({ items: [], nextCursor: null });
    await controller.list('lead-1', query);
    expect(deploymentEngineService.listForLead).toHaveBeenCalledWith('lead-1', query);
  });

  it('getById delegates to DeploymentEngineService.findByIdOrThrow with the lead id and deployment id', async () => {
    deploymentEngineService.findByIdOrThrow.mockResolvedValue({ id: 'deployment-1' });
    await expect(controller.getById('lead-1', 'deployment-1')).resolves.toEqual({
      id: 'deployment-1',
    });
    expect(deploymentEngineService.findByIdOrThrow).toHaveBeenCalledWith('lead-1', 'deployment-1');
  });

  it('create delegates to DeploymentEngineService.requestDeployment with the lead id, body, and current user id', async () => {
    const body = { commitHash: 'abc' } as never;
    deploymentEngineService.requestDeployment.mockResolvedValue({ id: 'deployment-1' });
    await controller.create('lead-1', body, user);
    expect(deploymentEngineService.requestDeployment).toHaveBeenCalledWith(
      'lead-1',
      body,
      'user-1',
    );
  });

  it('retry delegates to DeploymentEngineService.retryDeployment with the lead id, deployment id, and current user id', async () => {
    deploymentEngineService.retryDeployment.mockResolvedValue({ id: 'deployment-2' });
    await controller.retry('lead-1', 'deployment-1', user);
    expect(deploymentEngineService.retryDeployment).toHaveBeenCalledWith(
      'lead-1',
      'deployment-1',
      'user-1',
    );
  });
});
