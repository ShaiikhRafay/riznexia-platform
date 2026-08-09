import type { PrismaClient } from '@riznexia/db';
import { ReportingService } from './reporting.service';

function stage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stage-open',
    key: 'contacted',
    name: 'Contacted',
    order: 2,
    isWon: false,
    isLost: false,
    ...overrides,
  };
}

function leadCrmRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leadcrm-1',
    leadId: 'lead-1',
    stageId: 'stage-open',
    dealValueUsd: null,
    lostReasonId: null,
    ownerId: null,
    owner: null,
    lostReason: null,
    stage: stage(),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-05T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ReportingService', () => {
  let prisma: { leadCRM: { findMany: jest.Mock }; leadActivity: { findMany: jest.Mock } };
  let service: ReportingService;

  beforeEach(() => {
    prisma = {
      leadCRM: { findMany: jest.fn().mockResolvedValue([]) },
      leadActivity: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new ReportingService(prisma as unknown as PrismaClient);
  });

  it('returns null rates/cycle time and empty breakdowns when there is no data', async () => {
    const result = await service.getDashboardStats({});
    expect(result.conversionRatePercent).toBeNull();
    expect(result.winRatePercent).toBeNull();
    expect(result.averageSalesCycleDays).toBeNull();
    expect(result.pipelineValueByStage).toEqual([]);
    expect(result.totalPipelineValueUsd).toBe(0);
    expect(result.lostReasonsBreakdown).toEqual([]);
    expect(result.salesPerformanceByRep).toEqual([]);
  });

  it('applies ownerId/fromDate/toDate as leadCRM.findMany filters', async () => {
    await service.getDashboardStats({
      ownerId: 'rep-1',
      fromDate: '2026-07-01T00:00:00.000Z',
      toDate: '2026-08-01T00:00:00.000Z',
    });
    expect(prisma.leadCRM.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'rep-1',
        createdAt: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lte: new Date('2026-08-01T00:00:00.000Z'),
        },
      },
      include: { stage: true, lostReason: true, owner: true },
    });
  });

  it('groups open (non-won, non-lost) leads into pipelineValueByStage, ordered by stage.order', async () => {
    prisma.leadCRM.findMany.mockResolvedValue([
      leadCrmRow({
        leadId: 'a',
        stageId: 'stage-late',
        stage: stage({ id: 'stage-late', key: 'negotiation', name: 'Negotiation', order: 5 }),
        dealValueUsd: 1000,
      }),
      leadCrmRow({ leadId: 'b', stageId: 'stage-open', dealValueUsd: 500 }),
      leadCrmRow({ leadId: 'c', stageId: 'stage-open', dealValueUsd: 250 }),
    ]);

    const result = await service.getDashboardStats({});

    expect(result.pipelineValueByStage).toEqual([
      {
        stageId: 'stage-open',
        stageKey: 'contacted',
        stageName: 'Contacted',
        leadCount: 2,
        totalValueUsd: 750,
      },
      {
        stageId: 'stage-late',
        stageKey: 'negotiation',
        stageName: 'Negotiation',
        leadCount: 1,
        totalValueUsd: 1000,
      },
    ]);
    expect(result.totalPipelineValueUsd).toBe(1750);
  });

  it('excludes won and lost leads from pipelineValueByStage', async () => {
    prisma.leadCRM.findMany.mockResolvedValue([
      leadCrmRow({
        leadId: 'won-1',
        stage: stage({ id: 'stage-won', isWon: true }),
        stageId: 'stage-won',
        dealValueUsd: 5000,
      }),
      leadCrmRow({
        leadId: 'lost-1',
        stage: stage({ id: 'stage-lost', isLost: true }),
        stageId: 'stage-lost',
        dealValueUsd: 800,
      }),
    ]);

    const result = await service.getDashboardStats({});

    expect(result.pipelineValueByStage).toEqual([]);
    expect(result.totalPipelineValueUsd).toBe(0);
  });

  it('computes conversionRatePercent (won / total) and winRatePercent (won / (won+lost))', async () => {
    const won = stage({ id: 'stage-won', isWon: true });
    const lost = stage({ id: 'stage-lost', isLost: true });
    prisma.leadCRM.findMany.mockResolvedValue([
      leadCrmRow({ leadId: 'w1', stage: won, stageId: 'stage-won' }),
      leadCrmRow({ leadId: 'l1', stage: lost, stageId: 'stage-lost' }),
      leadCrmRow({ leadId: 'o1', stageId: 'stage-open' }),
      leadCrmRow({ leadId: 'o2', stageId: 'stage-open' }),
    ]);

    const result = await service.getDashboardStats({});

    // 1 won / 4 total = 25%
    expect(result.conversionRatePercent).toBe(25);
    // 1 won / (1 won + 1 lost) = 50%
    expect(result.winRatePercent).toBe(50);
  });

  it('computes averageSalesCycleDays from the most recent STAGE_CHANGED activity matching the won stage, falling back to updatedAt', async () => {
    const won = stage({ id: 'stage-won', isWon: true });
    prisma.leadCRM.findMany.mockResolvedValue([
      leadCrmRow({
        leadId: 'w1',
        stage: won,
        stageId: 'stage-won',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-20T00:00:00.000Z'),
      }),
      leadCrmRow({
        leadId: 'w2',
        stage: won,
        stageId: 'stage-won',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-31T00:00:00.000Z'),
      }),
    ]);
    prisma.leadActivity.findMany.mockResolvedValue([
      {
        leadId: 'w1',
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        detail: { to: 'stage-won' },
      },
      // w2 has no matching STAGE_CHANGED activity -> falls back to updatedAt
    ]);

    const result = await service.getDashboardStats({});

    // w1: 10 days (2026-07-01 -> 2026-07-11 via activity); w2: 30 days (via updatedAt fallback) -> avg 20
    expect(result.averageSalesCycleDays).toBe(20);
  });

  it('groups lostReasonsBreakdown by lostReasonId, with a null-id bucket for unspecified reasons', async () => {
    const lost = stage({ id: 'stage-lost', isLost: true });
    prisma.leadCRM.findMany.mockResolvedValue([
      leadCrmRow({
        leadId: 'l1',
        stage: lost,
        stageId: 'stage-lost',
        lostReasonId: 'reason-1',
        lostReason: { label: 'Price too high' },
      }),
      leadCrmRow({
        leadId: 'l2',
        stage: lost,
        stageId: 'stage-lost',
        lostReasonId: 'reason-1',
        lostReason: { label: 'Price too high' },
      }),
      leadCrmRow({
        leadId: 'l3',
        stage: lost,
        stageId: 'stage-lost',
        lostReasonId: null,
        lostReason: null,
      }),
    ]);

    const result = await service.getDashboardStats({});

    expect(result.lostReasonsBreakdown).toEqual([
      { lostReasonId: 'reason-1', lostReasonLabel: 'Price too high', count: 2 },
      { lostReasonId: null, lostReasonLabel: null, count: 1 },
    ]);
  });

  it('groups salesPerformanceByRep by ownerId, including an unassigned bucket, sorted by totalWonValueUsd desc', async () => {
    const won = stage({ id: 'stage-won', isWon: true });
    const lost = stage({ id: 'stage-lost', isLost: true });
    prisma.leadCRM.findMany.mockResolvedValue([
      leadCrmRow({
        leadId: 'a',
        ownerId: 'rep-1',
        owner: { name: 'Alice' },
        stage: won,
        stageId: 'stage-won',
        dealValueUsd: 1000,
      }),
      leadCrmRow({
        leadId: 'b',
        ownerId: 'rep-2',
        owner: { name: 'Bob' },
        stage: won,
        stageId: 'stage-won',
        dealValueUsd: 5000,
      }),
      leadCrmRow({
        leadId: 'c',
        ownerId: 'rep-1',
        owner: { name: 'Alice' },
        stage: lost,
        stageId: 'stage-lost',
      }),
      leadCrmRow({ leadId: 'd', ownerId: null, owner: null, stageId: 'stage-open' }),
    ]);

    const result = await service.getDashboardStats({});

    expect(result.salesPerformanceByRep).toEqual([
      expect.objectContaining({
        ownerId: 'rep-2',
        ownerName: 'Bob',
        wonCount: 1,
        lostCount: 0,
        openCount: 0,
        totalWonValueUsd: 5000,
      }),
      expect.objectContaining({
        ownerId: 'rep-1',
        ownerName: 'Alice',
        wonCount: 1,
        lostCount: 1,
        openCount: 0,
        totalWonValueUsd: 1000,
      }),
      expect.objectContaining({
        ownerId: null,
        ownerName: null,
        wonCount: 0,
        lostCount: 0,
        openCount: 1,
        totalWonValueUsd: 0,
      }),
    ]);
  });

  it('echoes the resolved filters back on the response', async () => {
    const result = await service.getDashboardStats({ ownerId: 'rep-1' });
    expect(result.filters).toEqual({ fromDate: null, toDate: null, ownerId: 'rep-1' });
    expect(result.generatedAt).toEqual(expect.any(String));
  });
});
