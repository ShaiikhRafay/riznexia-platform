import { describe, expect, it } from 'vitest';
import { dashboardQuerySchema, dashboardStatsSchema } from './dashboard-stats';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('dashboardStatsSchema', () => {
  it('accepts a fully-populated stats payload', () => {
    expect(
      dashboardStatsSchema.safeParse({
        generatedAt: new Date().toISOString(),
        filters: { fromDate: null, toDate: null, ownerId: null },
        pipelineValueByStage: [
          {
            stageId: UUID_A,
            stageKey: 'new',
            stageName: 'New',
            leadCount: 3,
            totalValueUsd: 15000,
          },
        ],
        totalPipelineValueUsd: 15000,
        conversionRatePercent: 42.5,
        winRatePercent: 30,
        averageSalesCycleDays: 12.5,
        lostReasonsBreakdown: [
          { lostReasonId: UUID_A, lostReasonLabel: 'Price too high', count: 4 },
        ],
        salesPerformanceByRep: [
          {
            ownerId: UUID_A,
            ownerName: 'Jane Doe',
            openCount: 5,
            wonCount: 2,
            lostCount: 1,
            totalWonValueUsd: 8000,
            averageSalesCycleDays: 10,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('accepts an empty pipeline (no leads yet) with null rates', () => {
    expect(
      dashboardStatsSchema.safeParse({
        generatedAt: new Date().toISOString(),
        filters: { fromDate: null, toDate: null, ownerId: null },
        pipelineValueByStage: [],
        totalPipelineValueUsd: 0,
        conversionRatePercent: null,
        winRatePercent: null,
        averageSalesCycleDays: null,
        lostReasonsBreakdown: [],
        salesPerformanceByRep: [],
      }).success,
    ).toBe(true);
  });

  it('rejects a win rate above 100', () => {
    expect(
      dashboardStatsSchema.safeParse({
        generatedAt: new Date().toISOString(),
        filters: { fromDate: null, toDate: null, ownerId: null },
        pipelineValueByStage: [],
        totalPipelineValueUsd: 0,
        conversionRatePercent: null,
        winRatePercent: 150,
        averageSalesCycleDays: null,
        lostReasonsBreakdown: [],
        salesPerformanceByRep: [],
      }).success,
    ).toBe(false);
  });
});

describe('dashboardQuerySchema', () => {
  it('accepts an empty query (all filters optional)', () => {
    expect(dashboardQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts a full filter set', () => {
    expect(
      dashboardQuerySchema.safeParse({
        fromDate: new Date().toISOString(),
        toDate: new Date().toISOString(),
        ownerId: UUID_A,
      }).success,
    ).toBe(true);
  });
});
