import { Inject, Injectable } from '@nestjs/common';
import {
  LeadActivityType as PrismaLeadActivityType,
  type Prisma,
  type PrismaClient,
} from '@riznexia/db';
import type {
  CreateSalesProposalInput,
  ListSalesProposalsQuery,
  SalesProposal,
  UpdateSalesProposalStatusInput,
} from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import {
  LeadNotFoundException,
  SalesProposalNotFoundException,
} from '../../common/exceptions/app.exception';
import { LeadActivityService } from '../../leads/lead-activity.service';
import { LeadCrmService } from '../pipeline/lead-crm.service';
import { toSalesProposalResponse } from './dto/sales-proposal-response.dto';
import { toPrismaProposalStatus } from './sales-proposal.mapper';

export interface PaginatedSalesProposals {
  items: SalesProposal[];
  nextCursor: string | null;
}

// Module M10 (DECISIONS.md D-085) — Proposal Engine. Each row IS one
// immutable version: `create` always inserts a new row (`version` is
// server-computed, never client-supplied), and `updateStatus` only ever
// touches lifecycle/tracking fields on an existing row, never `content`
// or `version` (the update schema structurally cannot carry `content`).
// A `sent_manually` transition is the one status change the founder
// listed as a trackable Activity — it reuses LeadActivityService and
// touches `LeadCRM.lastActivityAt`, same as the Activity Engine.
@Injectable()
export class SalesProposalService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadActivityService: LeadActivityService,
    private readonly leadCrmService: LeadCrmService,
  ) {}

  async listForLead(
    leadId: string,
    query: ListSalesProposalsQuery,
  ): Promise<PaginatedSalesProposals> {
    await this.assertLeadExists(leadId);

    const rows = await this.prisma.salesProposal.findMany({
      where: { leadId },
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      orderBy: { version: 'desc' },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toSalesProposalResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async findByIdOrThrow(leadId: string, proposalId: string): Promise<SalesProposal> {
    const proposal = await this.prisma.salesProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.leadId !== leadId) {
      throw new SalesProposalNotFoundException();
    }
    return toSalesProposalResponse(proposal);
  }

  async create(
    leadId: string,
    input: CreateSalesProposalInput,
    actorId: string | null,
  ): Promise<SalesProposal> {
    await this.assertLeadExists(leadId);

    const latest = await this.prisma.salesProposal.findFirst({
      where: { leadId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;

    const proposal = await this.prisma.salesProposal.create({
      data: {
        leadId,
        version,
        content: input.content ?? undefined,
        createdById: actorId ?? undefined,
      },
    });
    return toSalesProposalResponse(proposal);
  }

  async updateStatus(
    leadId: string,
    proposalId: string,
    input: UpdateSalesProposalStatusInput,
    actorId: string | null,
  ): Promise<SalesProposal> {
    const current = await this.prisma.salesProposal.findUnique({ where: { id: proposalId } });
    if (!current || current.leadId !== leadId) {
      throw new SalesProposalNotFoundException();
    }

    const prismaStatus = toPrismaProposalStatus(input.status);

    if (input.status === 'sent_manually') {
      // Ensures the LeadCRM row exists before the transaction touches it
      // (mirrors the Activity Engine's own use of this lazy get-or-create).
      await this.leadCrmService.getForLead(leadId);

      const updated = await this.prisma.$transaction(async (tx) => {
        const row = await tx.salesProposal.update({
          where: { id: proposalId },
          data: { status: prismaStatus, sentAt: new Date() },
        });
        await this.leadActivityService.record(
          {
            leadId,
            actorId,
            type: PrismaLeadActivityType.PROPOSAL_SENT,
            detail: { proposalId, version: current.version },
          },
          tx,
        );
        await tx.leadCRM.update({ where: { leadId }, data: { lastActivityAt: new Date() } });
        return row;
      });
      return toSalesProposalResponse(updated);
    }

    const data: Prisma.SalesProposalUncheckedUpdateInput = { status: prismaStatus };
    if (input.status === 'viewed') {
      data.viewedAt = new Date();
    } else if (input.status === 'accepted') {
      data.acceptedAt = new Date();
    } else if (input.status === 'rejected') {
      data.rejectedAt = new Date();
    }

    const updated = await this.prisma.salesProposal.update({ where: { id: proposalId }, data });
    return toSalesProposalResponse(updated);
  }

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
