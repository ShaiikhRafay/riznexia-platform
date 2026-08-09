import type { PrismaClient } from '@riznexia/db';
import type { LeadActivityService } from '../../leads/lead-activity.service';
import type { LeadCrmService } from '../pipeline/lead-crm.service';
import { CrmActivityService } from './crm-activity.service';

describe('CrmActivityService', () => {
  let prisma: { leadCRM: { update: jest.Mock }; $transaction: jest.Mock };
  let leadActivityService: { record: jest.Mock };
  let leadCrmService: { getForLead: jest.Mock };
  let service: CrmActivityService;

  beforeEach(() => {
    prisma = {
      leadCRM: { update: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    };
    leadActivityService = { record: jest.fn().mockResolvedValue(undefined) };
    leadCrmService = {
      getForLead: jest.fn().mockResolvedValue({ id: 'leadcrm-1', leadId: 'lead-1' }),
    };
    service = new CrmActivityService(
      prisma as unknown as PrismaClient,
      leadActivityService as unknown as LeadActivityService,
      leadCrmService as unknown as LeadCrmService,
    );
  });

  it('propagates LeadNotFoundException from getForLead for an unknown lead (doubles as the existence check)', async () => {
    const notFound = new Error('not found');
    leadCrmService.getForLead.mockRejectedValue(notFound);
    await expect(service.logManualActivity('missing', { type: 'call' }, 'actor-1')).rejects.toThrow(
      notFound,
    );
    expect(leadActivityService.record).not.toHaveBeenCalled();
  });

  it('records the activity with the mapped Prisma type and no detail when note/occurredAt are omitted', async () => {
    await service.logManualActivity('lead-1', { type: 'call' }, 'actor-1');
    expect(leadActivityService.record).toHaveBeenCalledWith(
      { leadId: 'lead-1', actorId: 'actor-1', type: 'CALL', detail: undefined },
      prisma,
    );
  });

  it('includes note and occurredAt in detail when provided', async () => {
    await service.logManualActivity(
      'lead-1',
      { type: 'meeting', note: 'Discussed pricing', occurredAt: '2026-08-01T00:00:00.000Z' },
      'actor-1',
    );
    expect(leadActivityService.record).toHaveBeenCalledWith(
      {
        leadId: 'lead-1',
        actorId: 'actor-1',
        type: 'MEETING',
        detail: { note: 'Discussed pricing', occurredAt: '2026-08-01T00:00:00.000Z' },
      },
      prisma,
    );
  });

  it('touches LeadCRM.lastActivityAt inside the same transaction as the activity record', async () => {
    await service.logManualActivity('lead-1', { type: 'whatsapp' }, 'actor-1');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.leadCRM.update).toHaveBeenCalledWith({
      where: { leadId: 'lead-1' },
      data: { lastActivityAt: expect.any(Date) },
    });
  });

  it('maps each of the four loggable types to its Prisma enum value', async () => {
    for (const [apiType, prismaType] of [
      ['call', 'CALL'],
      ['email', 'EMAIL'],
      ['meeting', 'MEETING'],
      ['whatsapp', 'WHATSAPP'],
    ] as const) {
      leadActivityService.record.mockClear();
      await service.logManualActivity('lead-1', { type: apiType }, 'actor-1');
      expect(leadActivityService.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: prismaType }),
        prisma,
      );
    }
  });
});
