import { Inject, Injectable } from '@nestjs/common';
import type {
  LeadActivityType as PrismaLeadActivityType,
  Prisma,
  PrismaClient,
} from '@riznexia/db';
import type { LeadActivity, ListLeadSubResourceQuery } from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { LeadNotFoundException } from '../common/exceptions/app.exception';
import { toLeadActivityResponse } from './dto/lead-sub-resource.dto';

export interface PaginatedLeadActivity {
  items: LeadActivity[];
  nextCursor: string | null;
}

export interface RecordActivityInput {
  leadId: string;
  actorId: string | null;
  type: PrismaLeadActivityType;
  detail?: Prisma.InputJsonValue;
}

// Accepts either the root client or an interactive-transaction client, so a
// caller can record an activity inside the same transaction as the write it
// describes — a lead update and its timeline entry commit together or not
// at all, never leaving the timeline claiming something that was rolled back.
type ActivityWriter = Pick<PrismaClient, 'leadActivity'>;

// Doc 16 §3 — Pipeline Context. The rep-facing lead timeline, deliberately
// separate from the `audit_log` security trail (DECISIONS.md D-032).
@Injectable()
export class LeadActivityService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * Write one timeline entry. Pass `client` when inside a transaction;
   * omitted, it writes on the root client.
   *
   * Unlike AuditLogService.record (best-effort, swallows failures because
   * the audited action has already succeeded by then), this one propagates:
   * it runs *inside* the transaction it describes, so a failure here should
   * roll the whole write back rather than silently produce a lead whose
   * history has a hole in it.
   */
  async record(input: RecordActivityInput, client?: ActivityWriter): Promise<void> {
    await (client ?? this.prisma).leadActivity.create({
      data: {
        leadId: input.leadId,
        actorId: input.actorId,
        type: input.type,
        detail: input.detail,
      },
    });
  }

  /** Same signature as `record`, for the several-entries-at-once case. */
  async recordMany(inputs: RecordActivityInput[], client?: ActivityWriter): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    for (const input of inputs) {
      await this.record(input, client);
    }
  }

  async listForLead(
    leadId: string,
    query: ListLeadSubResourceQuery,
  ): Promise<PaginatedLeadActivity> {
    await this.assertLeadExists(leadId);

    const rows = await this.prisma.leadActivity.findMany({
      where: { leadId },
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      // Newest first, `id` as a tiebreaker so the cursor stays stable when
      // several entries share a timestamp (a single update can emit a
      // stage-change and a tags-change in the same transaction).
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toLeadActivityResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  /**
   * Same rationale as LeadNotesService's identically-named check: an
   * unknown or soft-deleted lead is a 404 on the lead, not an empty
   * activity list implying the lead exists with no history.
   */
  private async assertLeadExists(leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId, business: { deletedAt: null } },
      select: { id: true },
    });
    if (!lead) {
      throw new LeadNotFoundException();
    }
  }
}
