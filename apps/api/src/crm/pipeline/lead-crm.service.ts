import { Inject, Injectable } from '@nestjs/common';
import { LeadActivityType as PrismaLeadActivityType, type PrismaClient } from '@riznexia/db';
import type {
  AssignLeadOwnerInput,
  LeadCRM,
  TransitionLeadStageInput,
  UpdateLeadCrmInput,
} from '@riznexia/shared-types';
import { TeamMemberService } from '../../auth/team-member.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import {
  LeadNotFoundException,
  LostReasonNotFoundException,
  LostReasonRequiredException,
  SalesStageNotFoundException,
  TeamMemberNotFoundException,
} from '../../common/exceptions/app.exception';
import { LeadActivityService } from '../../leads/lead-activity.service';
import { toLeadCrmResponse } from './dto/lead-crm-response.dto';

// Module M10 (DECISIONS.md D-083) — the Pipeline Engine's core service.
// Read-only get-or-create (no `LeadsModule` code ever needs to know this
// module exists — the dependency direction is strictly one-way, crm/ →
// leads/). Every mutation reuses the existing `LeadActivityService`
// (founder's Decision 5 — one unified timeline, not a parallel one),
// written inside the same transaction as the `LeadCRM` row change so
// the two commit or roll back together.
@Injectable()
export class LeadCrmService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadActivityService: LeadActivityService,
    private readonly teamMemberService: TeamMemberService,
  ) {}

  async getForLead(leadId: string): Promise<LeadCRM> {
    const row = await this.getOrCreate(leadId);
    return toLeadCrmResponse(row);
  }

  async transitionStage(
    leadId: string,
    input: TransitionLeadStageInput,
    actorId: string | null,
  ): Promise<LeadCRM> {
    const current = await this.getOrCreate(leadId);

    const targetStage = await this.prisma.salesStage.findUnique({ where: { id: input.stageId } });
    if (!targetStage) {
      throw new SalesStageNotFoundException();
    }

    let lostReasonId: string | null = null;
    if (targetStage.isLost) {
      if (!input.lostReasonId) {
        throw new LostReasonRequiredException();
      }
      const reason = await this.prisma.lostReason.findUnique({ where: { id: input.lostReasonId } });
      if (!reason) {
        throw new LostReasonNotFoundException();
      }
      lostReasonId = input.lostReasonId;
    }

    const fromStageId = current.stageId;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.leadCRM.update({
        where: { id: current.id },
        data: { stageId: input.stageId, lostReasonId },
      });
      await this.leadActivityService.record(
        {
          leadId,
          actorId,
          type: PrismaLeadActivityType.STAGE_CHANGED,
          detail: { from: fromStageId, to: input.stageId },
        },
        tx,
      );
      return row;
    });

    return toLeadCrmResponse(updated);
  }

  async assignOwner(
    leadId: string,
    input: AssignLeadOwnerInput,
    actorId: string | null,
  ): Promise<LeadCRM> {
    const current = await this.getOrCreate(leadId);

    if (input.ownerId !== null) {
      const owner = await this.teamMemberService.findById(input.ownerId);
      if (!owner) {
        throw new TeamMemberNotFoundException();
      }
    }

    const fromOwnerId = current.ownerId;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.leadCRM.update({
        where: { id: current.id },
        data: { ownerId: input.ownerId },
      });
      await this.leadActivityService.record(
        {
          leadId,
          actorId,
          type: input.ownerId ? PrismaLeadActivityType.ASSIGNED : PrismaLeadActivityType.UNASSIGNED,
          detail: { from: fromOwnerId, to: input.ownerId },
        },
        tx,
      );
      return row;
    });

    return toLeadCrmResponse(updated);
  }

  async update(leadId: string, input: UpdateLeadCrmInput): Promise<LeadCRM> {
    const current = await this.getOrCreate(leadId);
    const row = await this.prisma.leadCRM.update({
      where: { id: current.id },
      data: {
        ...(input.dealValueUsd !== undefined && { dealValueUsd: input.dealValueUsd }),
        ...(input.nextFollowUpAt !== undefined && {
          nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
        }),
      },
    });
    return toLeadCrmResponse(row);
  }

  /**
   * Lazily creates a `LeadCRM` row on first CRM interaction for a lead
   * (D-083) — `LeadsService.create()`/`ensureForBusiness()` never touch
   * this table. Defaults the new row's stage to `CrmSettings.defaultStageId`
   * when configured, otherwise the lowest-`order` non-archived stage.
   */
  private async getOrCreate(leadId: string) {
    const existing = await this.prisma.leadCRM.findUnique({ where: { leadId } });
    if (existing) {
      return existing;
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId, business: { deletedAt: null } },
      select: { id: true },
    });
    if (!lead) {
      throw new LeadNotFoundException();
    }

    const defaultStageId = await this.resolveDefaultStageId();
    return this.prisma.leadCRM.create({ data: { leadId, stageId: defaultStageId } });
  }

  private async resolveDefaultStageId(): Promise<string> {
    const settings = await this.prisma.crmSettings.findFirst();
    if (settings?.defaultStageId) {
      return settings.defaultStageId;
    }
    const lowestStage = await this.prisma.salesStage.findFirst({
      where: { archivedAt: null },
      orderBy: { order: 'asc' },
    });
    if (!lowestStage) {
      throw new Error('LeadCrmService: no SalesStage rows exist to default a new LeadCRM into.');
    }
    return lowestStage.id;
  }
}
