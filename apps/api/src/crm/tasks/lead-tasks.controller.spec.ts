import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { LeadTasksController } from './lead-tasks.controller';
import type { CrmTaskService } from './crm-task.service';

describe('LeadTasksController', () => {
  let crmTaskService: { listForLead: jest.Mock; create: jest.Mock };
  let controller: LeadTasksController;

  const user: RequestTeamMember = { id: 'user-1', clerkUserId: 'clerk_1', role: 'sales_executive' };

  beforeEach(() => {
    crmTaskService = { listForLead: jest.fn(), create: jest.fn() };
    controller = new LeadTasksController(crmTaskService as unknown as CrmTaskService);
  });

  it('list delegates to CrmTaskService.listForLead with the lead id and query', async () => {
    const query = { limit: 25 } as never;
    crmTaskService.listForLead.mockResolvedValue({ items: [], nextCursor: null });
    await controller.list('lead-1', query);
    expect(crmTaskService.listForLead).toHaveBeenCalledWith('lead-1', query);
  });

  it('create delegates to CrmTaskService.create with the lead id, body, and current user id', async () => {
    const body = {
      title: 'Follow up',
      dueDate: '2026-08-10T00:00:00.000Z',
      priority: 'medium',
    } as never;
    crmTaskService.create.mockResolvedValue({ id: 'task-1' });
    await controller.create('lead-1', body, user);
    expect(crmTaskService.create).toHaveBeenCalledWith('lead-1', body, 'user-1');
  });
});
