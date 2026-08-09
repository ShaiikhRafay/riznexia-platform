import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { LeadCrmController } from './lead-crm.controller';
import type { LeadCrmService } from './lead-crm.service';

describe('LeadCrmController', () => {
  let leadCrmService: {
    getForLead: jest.Mock;
    update: jest.Mock;
    transitionStage: jest.Mock;
    assignOwner: jest.Mock;
  };
  let controller: LeadCrmController;

  const user: RequestTeamMember = { id: 'user-1', clerkUserId: 'clerk_1', role: 'sales_executive' };

  beforeEach(() => {
    leadCrmService = {
      getForLead: jest.fn(),
      update: jest.fn(),
      transitionStage: jest.fn(),
      assignOwner: jest.fn(),
    };
    controller = new LeadCrmController(leadCrmService as unknown as LeadCrmService);
  });

  it('get delegates to LeadCrmService.getForLead with the lead id', async () => {
    leadCrmService.getForLead.mockResolvedValue({ id: 'leadcrm-1' });
    await expect(controller.get('lead-1')).resolves.toEqual({ id: 'leadcrm-1' });
    expect(leadCrmService.getForLead).toHaveBeenCalledWith('lead-1');
  });

  it('update delegates to LeadCrmService.update with the lead id and body', async () => {
    const body = { dealValueUsd: 5000 } as never;
    leadCrmService.update.mockResolvedValue({ id: 'leadcrm-1', dealValueUsd: 5000 });
    await controller.update('lead-1', body);
    expect(leadCrmService.update).toHaveBeenCalledWith('lead-1', body);
  });

  it('transitionStage delegates to LeadCrmService.transitionStage with the lead id, body, and current user id', async () => {
    const body = { stageId: 'stage-2' } as never;
    leadCrmService.transitionStage.mockResolvedValue({ id: 'leadcrm-1', stageId: 'stage-2' });
    await controller.transitionStage('lead-1', body, user);
    expect(leadCrmService.transitionStage).toHaveBeenCalledWith('lead-1', body, 'user-1');
  });

  it('assignOwner delegates to LeadCrmService.assignOwner with the lead id, body, and current user id', async () => {
    const body = { ownerId: 'rep-1' } as never;
    leadCrmService.assignOwner.mockResolvedValue({ id: 'leadcrm-1', ownerId: 'rep-1' });
    await controller.assignOwner('lead-1', body, user);
    expect(leadCrmService.assignOwner).toHaveBeenCalledWith('lead-1', body, 'user-1');
  });
});
