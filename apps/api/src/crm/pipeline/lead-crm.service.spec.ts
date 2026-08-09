import type { PrismaClient } from '@riznexia/db';
import {
  LeadNotFoundException,
  LostReasonNotFoundException,
  LostReasonRequiredException,
  SalesStageNotFoundException,
  TeamMemberNotFoundException,
} from '../../common/exceptions/app.exception';
import type { LeadActivityService } from '../../leads/lead-activity.service';
import type { TeamMemberService } from '../../auth/team-member.service';
import { LeadCrmService } from './lead-crm.service';

function fakeLeadCrmRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leadcrm-1',
    leadId: 'lead-1',
    stageId: 'stage-new',
    dealValueUsd: null,
    lostReasonId: null,
    ownerId: null,
    nextFollowUpAt: null,
    lastActivityAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('LeadCrmService', () => {
  let prisma: {
    leadCRM: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    lead: { findUnique: jest.Mock };
    salesStage: { findUnique: jest.Mock; findFirst: jest.Mock };
    lostReason: { findUnique: jest.Mock };
    crmSettings: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let leadActivityService: { record: jest.Mock };
  let teamMemberService: { findById: jest.Mock };
  let service: LeadCrmService;

  beforeEach(() => {
    prisma = {
      leadCRM: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      lead: { findUnique: jest.fn().mockResolvedValue({ id: 'lead-1' }) },
      salesStage: { findUnique: jest.fn(), findFirst: jest.fn() },
      lostReason: { findUnique: jest.fn() },
      crmSettings: { findFirst: jest.fn().mockResolvedValue({ defaultStageId: 'stage-new' }) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    };
    leadActivityService = { record: jest.fn().mockResolvedValue(undefined) };
    teamMemberService = { findById: jest.fn() };
    service = new LeadCrmService(
      prisma as unknown as PrismaClient,
      leadActivityService as unknown as LeadActivityService,
      teamMemberService as unknown as TeamMemberService,
    );
  });

  describe('getForLead (get-or-create)', () => {
    it('returns the existing row when one already exists', async () => {
      prisma.leadCRM.findUnique.mockResolvedValue(fakeLeadCrmRow());
      const result = await service.getForLead('lead-1');
      expect(result.id).toBe('leadcrm-1');
      expect(prisma.leadCRM.create).not.toHaveBeenCalled();
    });

    it('lazily creates a row defaulting to CrmSettings.defaultStageId when none exists', async () => {
      prisma.leadCRM.findUnique.mockResolvedValue(null);
      prisma.leadCRM.create.mockResolvedValue(fakeLeadCrmRow());
      await service.getForLead('lead-1');
      expect(prisma.leadCRM.create).toHaveBeenCalledWith({
        data: { leadId: 'lead-1', stageId: 'stage-new' },
      });
    });

    it('falls back to the lowest-order non-archived stage when CrmSettings has no default configured', async () => {
      prisma.leadCRM.findUnique.mockResolvedValue(null);
      prisma.crmSettings.findFirst.mockResolvedValue({ defaultStageId: null });
      prisma.salesStage.findFirst.mockResolvedValue({ id: 'stage-fallback' });
      prisma.leadCRM.create.mockResolvedValue(fakeLeadCrmRow({ stageId: 'stage-fallback' }));

      await service.getForLead('lead-1');

      expect(prisma.salesStage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { archivedAt: null }, orderBy: { order: 'asc' } }),
      );
      expect(prisma.leadCRM.create).toHaveBeenCalledWith({
        data: { leadId: 'lead-1', stageId: 'stage-fallback' },
      });
    });

    it('throws LeadNotFoundException when the underlying lead does not exist', async () => {
      prisma.leadCRM.findUnique.mockResolvedValue(null);
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.getForLead('missing')).rejects.toBeInstanceOf(LeadNotFoundException);
    });
  });

  describe('transitionStage', () => {
    beforeEach(() => {
      prisma.leadCRM.findUnique.mockResolvedValue(fakeLeadCrmRow({ stageId: 'stage-new' }));
    });

    it('throws SalesStageNotFoundException for an unknown target stage', async () => {
      prisma.salesStage.findUnique.mockResolvedValue(null);
      await expect(
        service.transitionStage('lead-1', { stageId: 'missing' }, 'actor-1'),
      ).rejects.toBeInstanceOf(SalesStageNotFoundException);
    });

    it('requires a lostReasonId when moving into an isLost stage', async () => {
      prisma.salesStage.findUnique.mockResolvedValue({
        id: 'stage-lost',
        isLost: true,
        isWon: false,
      });
      await expect(
        service.transitionStage('lead-1', { stageId: 'stage-lost' }, 'actor-1'),
      ).rejects.toBeInstanceOf(LostReasonRequiredException);
    });

    it('validates the lostReasonId references a real row', async () => {
      prisma.salesStage.findUnique.mockResolvedValue({
        id: 'stage-lost',
        isLost: true,
        isWon: false,
      });
      prisma.lostReason.findUnique.mockResolvedValue(null);
      await expect(
        service.transitionStage(
          'lead-1',
          { stageId: 'stage-lost', lostReasonId: 'missing' },
          'actor-1',
        ),
      ).rejects.toBeInstanceOf(LostReasonNotFoundException);
    });

    it('transitions to a non-lost stage without requiring a lostReasonId, clearing any prior one', async () => {
      prisma.leadCRM.findUnique.mockResolvedValue(
        fakeLeadCrmRow({ stageId: 'stage-lost', lostReasonId: 'reason-1' }),
      );
      prisma.salesStage.findUnique.mockResolvedValue({
        id: 'stage-negotiation',
        isLost: false,
        isWon: false,
      });
      prisma.leadCRM.update.mockResolvedValue(
        fakeLeadCrmRow({ stageId: 'stage-negotiation', lostReasonId: null }),
      );

      const result = await service.transitionStage(
        'lead-1',
        { stageId: 'stage-negotiation' },
        'actor-1',
      );

      expect(prisma.leadCRM.update).toHaveBeenCalledWith({
        where: { id: 'leadcrm-1' },
        data: { stageId: 'stage-negotiation', lostReasonId: null },
      });
      expect(result.lostReasonId).toBeNull();
    });

    it('logs a real STAGE_CHANGED activity with from/to detail, inside the same transaction', async () => {
      prisma.salesStage.findUnique.mockResolvedValue({
        id: 'stage-qualified',
        isLost: false,
        isWon: false,
      });
      prisma.leadCRM.update.mockResolvedValue(fakeLeadCrmRow({ stageId: 'stage-qualified' }));

      await service.transitionStage('lead-1', { stageId: 'stage-qualified' }, 'actor-1');

      expect(leadActivityService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          actorId: 'actor-1',
          type: 'STAGE_CHANGED',
          detail: { from: 'stage-new', to: 'stage-qualified' },
        }),
        prisma,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('records isWon stage moves too (no lost-reason requirement for won)', async () => {
      prisma.salesStage.findUnique.mockResolvedValue({
        id: 'stage-won',
        isLost: false,
        isWon: true,
      });
      prisma.leadCRM.update.mockResolvedValue(fakeLeadCrmRow({ stageId: 'stage-won' }));
      const result = await service.transitionStage('lead-1', { stageId: 'stage-won' }, 'actor-1');
      expect(result.stageId).toBe('stage-won');
    });
  });

  describe('assignOwner', () => {
    beforeEach(() => {
      prisma.leadCRM.findUnique.mockResolvedValue(fakeLeadCrmRow({ ownerId: null }));
    });

    it('throws TeamMemberNotFoundException for an unknown owner', async () => {
      teamMemberService.findById.mockResolvedValue(null);
      await expect(
        service.assignOwner('lead-1', { ownerId: 'missing' }, 'actor-1'),
      ).rejects.toBeInstanceOf(TeamMemberNotFoundException);
    });

    it('assigns a real owner and logs ASSIGNED', async () => {
      teamMemberService.findById.mockResolvedValue({ id: 'rep-1' });
      prisma.leadCRM.update.mockResolvedValue(fakeLeadCrmRow({ ownerId: 'rep-1' }));

      const result = await service.assignOwner('lead-1', { ownerId: 'rep-1' }, 'actor-1');

      expect(result.ownerId).toBe('rep-1');
      expect(leadActivityService.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ASSIGNED', detail: { from: null, to: 'rep-1' } }),
        prisma,
      );
    });

    it('unassigns (explicit null) without validating a TeamMember, logging UNASSIGNED', async () => {
      prisma.leadCRM.findUnique.mockResolvedValue(fakeLeadCrmRow({ ownerId: 'rep-1' }));
      prisma.leadCRM.update.mockResolvedValue(fakeLeadCrmRow({ ownerId: null }));

      await service.assignOwner('lead-1', { ownerId: null }, 'actor-1');

      expect(teamMemberService.findById).not.toHaveBeenCalled();
      expect(leadActivityService.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'UNASSIGNED', detail: { from: 'rep-1', to: null } }),
        prisma,
      );
    });
  });

  describe('update', () => {
    it('updates dealValueUsd and nextFollowUpAt', async () => {
      prisma.leadCRM.findUnique.mockResolvedValue(fakeLeadCrmRow());
      prisma.leadCRM.update.mockResolvedValue(fakeLeadCrmRow({ dealValueUsd: 5000 }));

      await service.update('lead-1', {
        dealValueUsd: 5000,
        nextFollowUpAt: '2026-09-01T00:00:00.000Z',
      });

      expect(prisma.leadCRM.update).toHaveBeenCalledWith({
        where: { id: 'leadcrm-1' },
        data: { dealValueUsd: 5000, nextFollowUpAt: new Date('2026-09-01T00:00:00.000Z') },
      });
    });

    it('clears nextFollowUpAt on explicit null', async () => {
      prisma.leadCRM.findUnique.mockResolvedValue(fakeLeadCrmRow({ nextFollowUpAt: new Date() }));
      prisma.leadCRM.update.mockResolvedValue(fakeLeadCrmRow({ nextFollowUpAt: null }));

      await service.update('lead-1', { nextFollowUpAt: null });

      expect(prisma.leadCRM.update).toHaveBeenCalledWith({
        where: { id: 'leadcrm-1' },
        data: { nextFollowUpAt: null },
      });
    });
  });
});
