import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { SalesProposalController } from './sales-proposal.controller';
import type { SalesProposalService } from './sales-proposal.service';

describe('SalesProposalController', () => {
  let salesProposalService: {
    listForLead: jest.Mock;
    findByIdOrThrow: jest.Mock;
    create: jest.Mock;
    updateStatus: jest.Mock;
  };
  let controller: SalesProposalController;

  const user: RequestTeamMember = { id: 'user-1', clerkUserId: 'clerk_1', role: 'sales_executive' };

  beforeEach(() => {
    salesProposalService = {
      listForLead: jest.fn(),
      findByIdOrThrow: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    controller = new SalesProposalController(
      salesProposalService as unknown as SalesProposalService,
    );
  });

  it('list delegates to SalesProposalService.listForLead with the lead id and query', async () => {
    const query = { limit: 25 } as never;
    salesProposalService.listForLead.mockResolvedValue({ items: [], nextCursor: null });
    await controller.list('lead-1', query);
    expect(salesProposalService.listForLead).toHaveBeenCalledWith('lead-1', query);
  });

  it('getById delegates to SalesProposalService.findByIdOrThrow with the lead id and proposal id', async () => {
    salesProposalService.findByIdOrThrow.mockResolvedValue({ id: 'proposal-1' });
    await expect(controller.getById('lead-1', 'proposal-1')).resolves.toEqual({ id: 'proposal-1' });
    expect(salesProposalService.findByIdOrThrow).toHaveBeenCalledWith('lead-1', 'proposal-1');
  });

  it('create delegates to SalesProposalService.create with the lead id, body, and current user id', async () => {
    const body = { content: 'Draft' } as never;
    salesProposalService.create.mockResolvedValue({ id: 'proposal-1' });
    await controller.create('lead-1', body, user);
    expect(salesProposalService.create).toHaveBeenCalledWith('lead-1', body, 'user-1');
  });

  it('updateStatus delegates to SalesProposalService.updateStatus with the lead id, proposal id, body, and current user id', async () => {
    const body = { status: 'sent_manually' } as never;
    salesProposalService.updateStatus.mockResolvedValue({
      id: 'proposal-1',
      status: 'sent_manually',
    });
    await controller.updateStatus('lead-1', 'proposal-1', body, user);
    expect(salesProposalService.updateStatus).toHaveBeenCalledWith(
      'lead-1',
      'proposal-1',
      body,
      'user-1',
    );
  });
});
