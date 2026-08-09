import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { RollbackEngineController } from './rollback-engine.controller';
import type { RollbackEngineService } from './rollback-engine.service';

describe('RollbackEngineController', () => {
  let rollbackEngineService: { rollbackTo: jest.Mock };
  let controller: RollbackEngineController;

  const user: RequestTeamMember = { id: 'user-1', clerkUserId: 'clerk_1', role: 'admin' };

  beforeEach(() => {
    rollbackEngineService = { rollbackTo: jest.fn() };
    controller = new RollbackEngineController(
      rollbackEngineService as unknown as RollbackEngineService,
    );
  });

  it('rollback delegates to RollbackEngineService.rollbackTo with the lead id, target deployment id, and current user id', async () => {
    rollbackEngineService.rollbackTo.mockResolvedValue({ id: 'deployment-2' });
    await controller.rollback('lead-1', 'deployment-1', user);
    expect(rollbackEngineService.rollbackTo).toHaveBeenCalledWith(
      'lead-1',
      'deployment-1',
      'user-1',
    );
  });
});
