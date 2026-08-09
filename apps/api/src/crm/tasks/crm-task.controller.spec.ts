import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { CrmTaskController } from './crm-task.controller';
import type { CrmTaskService } from './crm-task.service';

describe('CrmTaskController', () => {
  let crmTaskService: { listAll: jest.Mock; findByIdOrThrow: jest.Mock; update: jest.Mock };
  let controller: CrmTaskController;

  const user: RequestTeamMember = { id: 'user-1', clerkUserId: 'clerk_1', role: 'sales_executive' };

  beforeEach(() => {
    crmTaskService = { listAll: jest.fn(), findByIdOrThrow: jest.fn(), update: jest.fn() };
    controller = new CrmTaskController(crmTaskService as unknown as CrmTaskService);
  });

  it('list delegates to CrmTaskService.listAll with the validated query', async () => {
    const query = { limit: 25 } as never;
    crmTaskService.listAll.mockResolvedValue({ items: [], nextCursor: null });
    await controller.list(query);
    expect(crmTaskService.listAll).toHaveBeenCalledWith(query);
  });

  it('getById delegates to CrmTaskService.findByIdOrThrow with the id', async () => {
    crmTaskService.findByIdOrThrow.mockResolvedValue({ id: 'task-1' });
    await expect(controller.getById('task-1')).resolves.toEqual({ id: 'task-1' });
    expect(crmTaskService.findByIdOrThrow).toHaveBeenCalledWith('task-1');
  });

  it('update delegates to CrmTaskService.update with the id, body, and current user id', async () => {
    const body = { status: 'completed' } as never;
    crmTaskService.update.mockResolvedValue({ id: 'task-1', status: 'completed' });
    await controller.update('task-1', body, user);
    expect(crmTaskService.update).toHaveBeenCalledWith('task-1', body, 'user-1');
  });
});
