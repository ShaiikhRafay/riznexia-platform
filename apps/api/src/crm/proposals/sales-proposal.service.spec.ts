import type { PrismaClient } from '@riznexia/db';
import {
  LeadNotFoundException,
  SalesProposalNotFoundException,
} from '../../common/exceptions/app.exception';
import type { LeadActivityService } from '../../leads/lead-activity.service';
import type { LeadCrmService } from '../pipeline/lead-crm.service';
import { SalesProposalService } from './sales-proposal.service';

function fakeProposalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proposal-1',
    leadId: 'lead-1',
    version: 1,
    content: null,
    status: 'DRAFT',
    sentAt: null,
    viewedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    createdById: 'actor-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SalesProposalService', () => {
  let prisma: {
    salesProposal: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    lead: { findUnique: jest.Mock };
    leadCRM: { update: jest.Mock };
    $transaction: jest.Mock;
  };
  let leadActivityService: { record: jest.Mock };
  let leadCrmService: { getForLead: jest.Mock };
  let service: SalesProposalService;

  beforeEach(() => {
    prisma = {
      salesProposal: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      lead: { findUnique: jest.fn().mockResolvedValue({ id: 'lead-1' }) },
      leadCRM: { update: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    };
    leadActivityService = { record: jest.fn().mockResolvedValue(undefined) };
    leadCrmService = {
      getForLead: jest.fn().mockResolvedValue({ id: 'leadcrm-1', leadId: 'lead-1' }),
    };
    service = new SalesProposalService(
      prisma as unknown as PrismaClient,
      leadActivityService as unknown as LeadActivityService,
      leadCrmService as unknown as LeadCrmService,
    );
  });

  describe('listForLead', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.listForLead('missing', { limit: 25 })).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('orders newest version first', async () => {
      prisma.salesProposal.findMany.mockResolvedValue([]);
      await service.listForLead('lead-1', { limit: 25 });
      expect(prisma.salesProposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { version: 'desc' } }),
      );
    });
  });

  describe('findByIdOrThrow', () => {
    it('throws SalesProposalNotFoundException when the id does not exist', async () => {
      prisma.salesProposal.findUnique.mockResolvedValue(null);
      await expect(service.findByIdOrThrow('lead-1', 'missing')).rejects.toBeInstanceOf(
        SalesProposalNotFoundException,
      );
    });

    it('throws SalesProposalNotFoundException when the proposal belongs to a different lead', async () => {
      prisma.salesProposal.findUnique.mockResolvedValue(fakeProposalRow({ leadId: 'other-lead' }));
      await expect(service.findByIdOrThrow('lead-1', 'proposal-1')).rejects.toBeInstanceOf(
        SalesProposalNotFoundException,
      );
    });
  });

  describe('create', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.create('missing', {}, 'actor-1')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('starts at version 1 for a lead with no prior proposals', async () => {
      prisma.salesProposal.findFirst.mockResolvedValue(null);
      prisma.salesProposal.create.mockResolvedValue(fakeProposalRow({ version: 1 }));
      await service.create('lead-1', { content: 'Draft text' }, 'actor-1');
      expect(prisma.salesProposal.create).toHaveBeenCalledWith({
        data: { leadId: 'lead-1', version: 1, content: 'Draft text', createdById: 'actor-1' },
      });
    });

    it('computes the next version as max existing version + 1, never overwriting a prior version', async () => {
      prisma.salesProposal.findFirst.mockResolvedValue({ version: 3 });
      prisma.salesProposal.create.mockResolvedValue(fakeProposalRow({ version: 4 }));
      await service.create('lead-1', {}, 'actor-1');
      expect(prisma.salesProposal.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: 4 }) }),
      );
    });
  });

  describe('updateStatus', () => {
    it('throws SalesProposalNotFoundException for an unknown id', async () => {
      prisma.salesProposal.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('lead-1', 'missing', { status: 'viewed' }, 'actor-1'),
      ).rejects.toBeInstanceOf(SalesProposalNotFoundException);
    });

    it('stamps viewedAt for status=viewed without touching LeadActivity or LeadCRM', async () => {
      prisma.salesProposal.findUnique.mockResolvedValue(fakeProposalRow());
      prisma.salesProposal.update.mockResolvedValue(fakeProposalRow({ status: 'VIEWED' }));

      await service.updateStatus('lead-1', 'proposal-1', { status: 'viewed' }, 'actor-1');

      expect(prisma.salesProposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: { status: 'VIEWED', viewedAt: expect.any(Date) },
      });
      expect(leadActivityService.record).not.toHaveBeenCalled();
    });

    it('stamps acceptedAt for status=accepted', async () => {
      prisma.salesProposal.findUnique.mockResolvedValue(fakeProposalRow());
      prisma.salesProposal.update.mockResolvedValue(fakeProposalRow({ status: 'ACCEPTED' }));
      await service.updateStatus('lead-1', 'proposal-1', { status: 'accepted' }, 'actor-1');
      expect(prisma.salesProposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: { status: 'ACCEPTED', acceptedAt: expect.any(Date) },
      });
    });

    it('stamps rejectedAt for status=rejected', async () => {
      prisma.salesProposal.findUnique.mockResolvedValue(fakeProposalRow());
      prisma.salesProposal.update.mockResolvedValue(fakeProposalRow({ status: 'REJECTED' }));
      await service.updateStatus('lead-1', 'proposal-1', { status: 'rejected' }, 'actor-1');
      expect(prisma.salesProposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: { status: 'REJECTED', rejectedAt: expect.any(Date) },
      });
    });

    it('for status=sent_manually: stamps sentAt, logs a PROPOSAL_SENT activity, and touches LeadCRM.lastActivityAt inside one transaction', async () => {
      prisma.salesProposal.findUnique.mockResolvedValue(fakeProposalRow({ version: 2 }));
      prisma.salesProposal.update.mockResolvedValue(
        fakeProposalRow({ status: 'SENT_MANUALLY', version: 2 }),
      );

      await service.updateStatus('lead-1', 'proposal-1', { status: 'sent_manually' }, 'actor-1');

      expect(leadCrmService.getForLead).toHaveBeenCalledWith('lead-1');
      expect(prisma.salesProposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: { status: 'SENT_MANUALLY', sentAt: expect.any(Date) },
      });
      expect(leadActivityService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          actorId: 'actor-1',
          type: 'PROPOSAL_SENT',
          detail: { proposalId: 'proposal-1', version: 2 },
        }),
        prisma,
      );
      expect(prisma.leadCRM.update).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        data: { lastActivityAt: expect.any(Date) },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
