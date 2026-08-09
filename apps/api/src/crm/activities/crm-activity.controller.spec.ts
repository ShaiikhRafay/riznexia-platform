import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { CrmActivityController } from './crm-activity.controller';
import type { CrmActivityService } from './crm-activity.service';

describe('CrmActivityController', () => {
  let crmActivityService: { logManualActivity: jest.Mock };
  let controller: CrmActivityController;

  const user: RequestTeamMember = { id: 'user-1', clerkUserId: 'clerk_1', role: 'sales_executive' };

  beforeEach(() => {
    crmActivityService = { logManualActivity: jest.fn().mockResolvedValue(undefined) };
    controller = new CrmActivityController(crmActivityService as unknown as CrmActivityService);
  });

  it('log delegates to CrmActivityService.logManualActivity with the lead id, body, and current user id', async () => {
    const body = { type: 'call' } as never;
    await controller.log('lead-1', body, user);
    expect(crmActivityService.logManualActivity).toHaveBeenCalledWith('lead-1', body, 'user-1');
  });
});
