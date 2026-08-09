import { Inject, Injectable } from '@nestjs/common';
import {
  LeadActivityType as PrismaLeadActivityType,
  type Prisma,
  type PrismaClient,
} from '@riznexia/db';
import type {
  DashboardQuery,
  DashboardStats,
  LostReasonBreakdown,
  PipelineValueByStage,
  SalesPerformanceByRep,
} from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../../common/database/database.constants';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const LEAD_CRM_INCLUDE = { stage: true, lostReason: true, owner: true } as const;
type LeadCrmRow = Prisma.LeadCRMGetPayload<{ include: typeof LEAD_CRM_INCLUDE }>;

// Module M10 (DECISIONS.md D-086/D-089) — Reporting Engine. Founder's
// Decision 6: this service only ever aggregates/sums/groups facts the
// Pipeline Engine already computed and persisted — `SalesStage.isWon`/
// `.isLost`, `LostReason.label`, `TeamMember.name` — it reads them via a
// plain Prisma `include` rather than re-deriving "what does won/lost
// mean" itself. It queries `leadCRM`/`leadActivity` directly (not through
// PipelineService's per-entity methods, which have no bulk-list surface)
// because a dashboard rollup over every lead would otherwise be an N+1.
@Injectable()
export class ReportingService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async getDashboardStats(query: DashboardQuery): Promise<DashboardStats> {
    const where: Prisma.LeadCRMWhereInput = {
      ...(query.ownerId && { ownerId: query.ownerId }),
      ...((query.fromDate || query.toDate) && {
        createdAt: {
          ...(query.fromDate && { gte: new Date(query.fromDate) }),
          ...(query.toDate && { lte: new Date(query.toDate) }),
        },
      }),
    };

    const rows = await this.prisma.leadCRM.findMany({ where, include: LEAD_CRM_INCLUDE });

    const wonRows = rows.filter((row) => row.stage.isWon);
    const lostRows = rows.filter((row) => row.stage.isLost);
    const openRows = rows.filter((row) => !row.stage.isWon && !row.stage.isLost);

    const wonAtByLeadId = await this.resolveWonAt(wonRows);

    const pipelineValueByStage = this.groupPipelineValueByStage(openRows);
    const totalPipelineValueUsd = round2(
      pipelineValueByStage.reduce((sum, stage) => sum + stage.totalValueUsd, 0),
    );

    const conversionRatePercent =
      rows.length > 0 ? round2((wonRows.length / rows.length) * 100) : null;
    const winRatePercent =
      wonRows.length + lostRows.length > 0
        ? round2((wonRows.length / (wonRows.length + lostRows.length)) * 100)
        : null;

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        fromDate: query.fromDate ?? null,
        toDate: query.toDate ?? null,
        ownerId: query.ownerId ?? null,
      },
      pipelineValueByStage,
      totalPipelineValueUsd,
      conversionRatePercent,
      winRatePercent,
      averageSalesCycleDays: this.averageCycleDays(wonRows, wonAtByLeadId),
      lostReasonsBreakdown: this.groupLostReasons(lostRows),
      salesPerformanceByRep: this.groupByRep(rows, wonAtByLeadId),
    };
  }

  private groupPipelineValueByStage(openRows: LeadCrmRow[]): PipelineValueByStage[] {
    const map = new Map<string, { order: number; data: PipelineValueByStage }>();
    for (const row of openRows) {
      const value = row.dealValueUsd ? Number(row.dealValueUsd) : 0;
      const existing = map.get(row.stageId);
      if (existing) {
        existing.data.leadCount += 1;
        existing.data.totalValueUsd = round2(existing.data.totalValueUsd + value);
      } else {
        map.set(row.stageId, {
          order: row.stage.order,
          data: {
            stageId: row.stageId,
            stageKey: row.stage.key,
            stageName: row.stage.name,
            leadCount: 1,
            totalValueUsd: round2(value),
          },
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.data);
  }

  private groupLostReasons(lostRows: LeadCrmRow[]): LostReasonBreakdown[] {
    const map = new Map<string, LostReasonBreakdown>();
    let unspecifiedCount = 0;
    for (const row of lostRows) {
      if (!row.lostReasonId) {
        unspecifiedCount += 1;
        continue;
      }
      const existing = map.get(row.lostReasonId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(row.lostReasonId, {
          lostReasonId: row.lostReasonId,
          lostReasonLabel: row.lostReason?.label ?? null,
          count: 1,
        });
      }
    }
    const result = Array.from(map.values()).sort((a, b) => b.count - a.count);
    if (unspecifiedCount > 0) {
      result.push({ lostReasonId: null, lostReasonLabel: null, count: unspecifiedCount });
    }
    return result;
  }

  private groupByRep(
    rows: LeadCrmRow[],
    wonAtByLeadId: Map<string, Date>,
  ): SalesPerformanceByRep[] {
    const UNASSIGNED = '__unassigned__';
    const map = new Map<string, { data: SalesPerformanceByRep; cycleDays: number[] }>();

    for (const row of rows) {
      const key = row.ownerId ?? UNASSIGNED;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          data: {
            ownerId: row.ownerId,
            ownerName: row.owner?.name ?? null,
            openCount: 0,
            wonCount: 0,
            lostCount: 0,
            totalWonValueUsd: 0,
            averageSalesCycleDays: null,
          },
          cycleDays: [],
        };
        map.set(key, entry);
      }

      if (row.stage.isWon) {
        entry.data.wonCount += 1;
        entry.data.totalWonValueUsd += row.dealValueUsd ? Number(row.dealValueUsd) : 0;
        entry.cycleDays.push(
          daysBetween(row.createdAt, wonAtByLeadId.get(row.leadId) ?? row.updatedAt),
        );
      } else if (row.stage.isLost) {
        entry.data.lostCount += 1;
      } else {
        entry.data.openCount += 1;
      }
    }

    return Array.from(map.values())
      .map((entry) => {
        entry.data.totalWonValueUsd = round2(entry.data.totalWonValueUsd);
        entry.data.averageSalesCycleDays =
          entry.cycleDays.length > 0 ? round2(average(entry.cycleDays)) : null;
        return entry.data;
      })
      .sort((a, b) => b.totalWonValueUsd - a.totalWonValueUsd);
  }

  private averageCycleDays(wonRows: LeadCrmRow[], wonAtByLeadId: Map<string, Date>): number | null {
    if (wonRows.length === 0) {
      return null;
    }
    const days = wonRows.map((row) =>
      daysBetween(row.createdAt, wonAtByLeadId.get(row.leadId) ?? row.updatedAt),
    );
    return round2(average(days));
  }

  /**
   * For each won lead, finds the most recent STAGE_CHANGED activity whose
   * `detail.to` matches the lead's current (won) stage — the closest
   * available proxy for "when this lead was won", since no dedicated
   * `wonAt` timestamp is stored. Falls back to `LeadCRM.updatedAt` in the
   * caller when a lead has no matching activity (e.g. seeded data).
   */
  private async resolveWonAt(wonRows: LeadCrmRow[]): Promise<Map<string, Date>> {
    if (wonRows.length === 0) {
      return new Map();
    }

    const stageIdByLeadId = new Map(wonRows.map((row) => [row.leadId, row.stageId]));
    const activities = await this.prisma.leadActivity.findMany({
      where: {
        leadId: { in: wonRows.map((row) => row.leadId) },
        type: PrismaLeadActivityType.STAGE_CHANGED,
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = new Map<string, Date>();
    for (const activity of activities) {
      const detail = activity.detail as { to?: string } | null;
      if (detail?.to && detail.to === stageIdByLeadId.get(activity.leadId)) {
        // orderBy asc — each later match overwrites, leaving the most
        // recent transition into this lead's current stage.
        result.set(activity.leadId, activity.createdAt);
      }
    }
    return result;
  }
}

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
