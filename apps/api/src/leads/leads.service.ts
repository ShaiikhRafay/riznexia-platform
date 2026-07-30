import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  LeadActivityType as PrismaLeadActivityType,
  PipelineStage as PrismaPipelineStage,
} from '@riznexia/db';
import type { Prisma, PrismaClient } from '@riznexia/db';
import {
  LEAD_SORT_FIELDS,
  type CreateLeadInput,
  type Lead,
  type ListLeadsQuery,
  type UpdateLeadInput,
} from '@riznexia/shared-types';
import { TeamMemberService } from '../auth/team-member.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  BusinessNotFoundException,
  DuplicateLeadException,
  InvalidSortFieldException,
  LeadNotFoundException,
  TeamMemberNotFoundException,
} from '../common/exceptions/app.exception';
import { BusinessService } from '../business/business.service';
import { toLeadResponse, type LeadWithBusiness } from './dto/lead-response.dto';
import { LeadActivityService } from './lead-activity.service';
import { toPrismaPipelineStage } from './lead.mapper';

export interface PaginatedLeads {
  items: Lead[];
  nextCursor: string | null;
}

export interface EnsureLeadResult {
  id: string;
  wasNew: boolean;
}

const LEAD_INCLUDE_BUSINESS = { business: true } as const;

// Doc 16 §3 — Pipeline Context owns `lead`: purely the pipeline-state half
// of a sales pursuit (stage, assignment, notes/tags). Business data lives
// on `Business` as of Module M2 and is read here only via a Prisma
// `include`, never duplicated. Every write to this table goes through this
// service, including the discovery pipeline's writes (Doc 22 §14) and
// Module M4's CRUD/workflow endpoints — DiscoveryRunnerService and
// LeadsController never touch Prisma's `lead` model directly.
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly businessService: BusinessService,
    private readonly teamMemberService: TeamMemberService,
    private readonly activityService: LeadActivityService,
  ) {}

  async findMany(query: ListLeadsQuery): Promise<PaginatedLeads> {
    const where: Prisma.LeadWhereInput = {
      ...(query.stage && { pipelineStage: toPrismaPipelineStage(query.stage) }),
      ...(query.assignedTo && { assignedToId: query.assignedTo }),
      ...(query.tag && { tags: { has: query.tag } }),
      // `business` is a required (non-null) relation, so this is always a
      // safe, always-applicable filter — not just conditional on
      // city/category/q being present — and it's what keeps a lead whose
      // parent business has been soft-deleted out of the read path (the
      // soft-delete extension only auto-scopes the top-level model being
      // queried, not rows reached through a nested `include`/`where`).
      business: {
        deletedAt: null,
        ...(query.city && { city: query.city }),
        ...(query.category && { category: query.category }),
        ...(query.q && { businessName: { contains: query.q, mode: 'insensitive' } }),
      },
    };

    const rows = await this.prisma.lead.findMany({
      where,
      include: LEAD_INCLUDE_BUSINESS,
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      orderBy: this.resolveSortOrder(query.sort),
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toLeadResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async findById(id: string): Promise<Lead | null> {
    const lead = await this.prisma.lead.findUnique({
      where: { id, business: { deletedAt: null } },
      include: LEAD_INCLUDE_BUSINESS,
    });
    return lead ? toLeadResponse(lead) : null;
  }

  /**
   * Module M4 (DECISIONS.md D-030). A Lead is always the pursuit of an
   * *existing* Business — Module M2 made `businessId` a required, unique
   * FK, so there is no "create a standalone lead" shape. Manual business
   * entry (BRD §9's "allow manual lead entry as fallback") would need
   * `Business.googlePlaceId` to tolerate null, which is Module M5's
   * territory, not this one's — resolved with the founder before writing
   * any code (see the module's opening architecture review).
   */
  async create(input: CreateLeadInput, actorId: string): Promise<Lead> {
    const business = await this.businessService.findById(input.businessId);
    if (!business) {
      throw new BusinessNotFoundException();
    }

    const existing = await this.prisma.lead.findUnique({
      where: { businessId: input.businessId },
      select: { id: true },
    });
    if (existing) {
      throw new DuplicateLeadException();
    }

    if (input.assignedTo) {
      await this.assertTeamMemberExists(input.assignedTo);
    }

    const tags = input.tags ?? [];
    const pipelineStage = input.pipelineStage
      ? toPrismaPipelineStage(input.pipelineStage)
      : undefined; // omitted -> DB default (NEW), not hardcoded here

    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          businessId: input.businessId,
          ...(pipelineStage && { pipelineStage }),
          assignedToId: input.assignedTo ?? undefined,
          tags,
        },
        include: LEAD_INCLUDE_BUSINESS,
      });

      await this.activityService.record(
        {
          leadId: created.id,
          actorId,
          type: PrismaLeadActivityType.CREATED,
          detail: {
            pipelineStage: created.pipelineStage,
            assignedTo: created.assignedToId,
            tags: created.tags,
          },
        },
        tx,
      );

      return created;
    });

    this.logger.log(`Lead ${lead.id} created for business ${lead.businessId} by ${actorId}`);
    return toLeadResponse(lead);
  }

  /**
   * PATCH semantics (`updateLeadSchema`): every field is optional, and
   * `assignedTo: null` (explicit unassign) is distinguished from an omitted
   * `assignedTo` (leave alone) at the zod layer already — this method never
   * has to guess intent from `undefined`.
   *
   * Every field that actually changed gets its own `LeadActivity` row in
   * the same transaction as the update, so a single PATCH that both
   * reassigns and changes stage produces two timeline entries, not one
   * vague "lead updated."
   */
  async update(id: string, input: UpdateLeadInput, actorId: string): Promise<Lead> {
    const existing = await this.prisma.lead.findUnique({
      where: { id, business: { deletedAt: null } },
      include: LEAD_INCLUDE_BUSINESS,
    });
    if (!existing) {
      throw new LeadNotFoundException();
    }

    const assignedToProvided = Object.hasOwn(input, 'assignedTo');
    if (assignedToProvided && input.assignedTo) {
      await this.assertTeamMemberExists(input.assignedTo);
    }

    const data: Prisma.LeadUpdateInput = {
      ...(input.pipelineStage && { pipelineStage: toPrismaPipelineStage(input.pipelineStage) }),
      ...(assignedToProvided && { assignedToId: input.assignedTo }),
      ...(input.tags && { tags: input.tags }),
    };

    const lead = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data,
        include: LEAD_INCLUDE_BUSINESS,
      });

      const activities = this.diffActivities(existing, updated, actorId);
      await this.activityService.recordMany(activities, tx);
      return { updated, changedFields: activities.map((a) => a.type) };
    });

    if (lead.changedFields.length > 0) {
      this.logger.log(`Lead ${id} updated by ${actorId}: ${lead.changedFields.join(', ')}`);
    } else {
      this.logger.warn(`Lead ${id} PATCH by ${actorId} changed nothing meaningful`);
    }

    return toLeadResponse(lead.updated);
  }

  /**
   * Reroutes to an `UPDATE ... SET deleted_at` via the soft-delete Prisma
   * Client Extension (Module M2, DECISIONS.md D-019) — this is a plain
   * `lead.delete()` call, not a hand-rolled soft-delete, and it composes
   * correctly inside `$transaction` because the extension is applied to
   * the client itself, not bolted onto individual calls.
   */
  async softDelete(id: string, actorId: string): Promise<void> {
    const existing = await this.prisma.lead.findUnique({
      where: { id, business: { deletedAt: null } },
      select: { id: true },
    });
    if (!existing) {
      throw new LeadNotFoundException();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.delete({ where: { id } });
      await this.activityService.record(
        { leadId: id, actorId, type: PrismaLeadActivityType.DELETED },
        tx,
      );
    });

    this.logger.log(`Lead ${id} soft-deleted by ${actorId}`);
  }

  /**
   * Used by the discovery pipeline to create-if-none-exists for a
   * qualifying (none/outdated) Business (Doc 22 §5/§6, FR-1.7).
   * `businessId` is unique on this table, so this is idempotent: rerunning
   * discovery against an already-tracked business is a no-op here — the
   * rep's pipeline_stage, assignedToId, and tags/notes (their CRM progress)
   * are never touched by rediscovery. Pipeline-initiated, not user-
   * initiated, so it records its own CREATED activity with a null actor
   * rather than going through `create()`'s human-facing validation
   * (there's no `assignedTo`/duplicate-lead input to validate here — the
   * caller already resolved the Business).
   */
  async ensureForBusiness(businessId: string): Promise<EnsureLeadResult> {
    const existing = await this.prisma.lead.findUnique({ where: { businessId } });
    if (existing) {
      return { id: existing.id, wasNew: false };
    }

    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: { businessId, pipelineStage: PrismaPipelineStage.NEW },
      });
      await this.activityService.record(
        { leadId: created.id, actorId: null, type: PrismaLeadActivityType.CREATED },
        tx,
      );
      return created;
    });

    return { id: lead.id, wasNew: true };
  }

  private async assertTeamMemberExists(teamMemberId: string): Promise<void> {
    const member = await this.teamMemberService.findById(teamMemberId);
    if (!member) {
      throw new TeamMemberNotFoundException();
    }
  }

  /**
   * Doc 19 §1: `?sort=field` ascending, `?sort=-field` descending, each
   * endpoint whitelisting its sortable fields — an unlisted field is a
   * `400 INVALID_SORT_FIELD`, not silently ignored or defaulted. `id` is
   * always appended as a tiebreaker so cursor pagination stays stable when
   * the primary sort field has duplicate values (e.g. many leads created
   * in the same discovery run share a `createdAt` down to the millisecond).
   */
  private resolveSortOrder(sort: string | undefined): Prisma.LeadOrderByWithRelationInput[] {
    if (!sort) {
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    }

    const descending = sort.startsWith('-');
    const field = descending ? sort.slice(1) : sort;
    const direction: Prisma.SortOrder = descending ? 'desc' : 'asc';

    if (!LEAD_SORT_FIELDS.includes(field as (typeof LEAD_SORT_FIELDS)[number])) {
      throw new InvalidSortFieldException(field, LEAD_SORT_FIELDS);
    }

    const primary: Prisma.LeadOrderByWithRelationInput =
      field === 'businessName' ? { business: { businessName: direction } } : { [field]: direction };

    return [primary, { id: 'desc' }];
  }

  /**
   * One entry per field that actually changed — a PATCH that touches
   * nothing meaningful (e.g. re-sends the current pipelineStage) produces
   * no activity rows, not a misleading "stage_changed" with identical
   * before/after values.
   */
  private diffActivities(
    before: LeadWithBusiness,
    after: LeadWithBusiness,
    actorId: string,
  ): Array<Parameters<LeadActivityService['record']>[0]> {
    const activities: Array<Parameters<LeadActivityService['record']>[0]> = [];

    if (before.pipelineStage !== after.pipelineStage) {
      activities.push({
        leadId: after.id,
        actorId,
        type: PrismaLeadActivityType.STAGE_CHANGED,
        detail: { from: before.pipelineStage, to: after.pipelineStage },
      });
    }

    if (before.assignedToId !== after.assignedToId) {
      activities.push({
        leadId: after.id,
        actorId,
        type: after.assignedToId
          ? PrismaLeadActivityType.ASSIGNED
          : PrismaLeadActivityType.UNASSIGNED,
        detail: { from: before.assignedToId, to: after.assignedToId },
      });
    }

    if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) {
      activities.push({
        leadId: after.id,
        actorId,
        type: PrismaLeadActivityType.TAGS_CHANGED,
        detail: { from: before.tags, to: after.tags },
      });
    }

    return activities;
  }
}
