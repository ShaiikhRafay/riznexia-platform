import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import type {
  CreateCrmTaskInput,
  CrmTask,
  ListCrmTasksQuery,
  ListLeadTasksQuery,
  UpdateCrmTaskInput,
} from '@riznexia/shared-types';
import { TeamMemberService } from '../../auth/team-member.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import {
  CrmTaskNotFoundException,
  LeadNotFoundException,
  TeamMemberNotFoundException,
} from '../../common/exceptions/app.exception';
import { toCrmTaskResponse } from './dto/crm-task-response.dto';
import { toPrismaTaskPriority, toPrismaTaskStatus } from './crm-task.mapper';

export interface PaginatedCrmTasks {
  items: CrmTask[];
  nextCursor: string | null;
}

// Module M10 — Task Engine. "Follow-ups"/"Reminders" are not separate
// entities — see the schema/shared-types doc comments. Task completion is
// not one of the founder's listed Activities-to-track, so unlike the
// Pipeline Engine this service never writes to LeadActivity.
@Injectable()
export class CrmTaskService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly teamMemberService: TeamMemberService,
  ) {}

  async listForLead(leadId: string, query: ListLeadTasksQuery): Promise<PaginatedCrmTasks> {
    await this.assertLeadExists(leadId);

    const where: Prisma.CrmTaskWhereInput = {
      leadId,
      ...(query.status && { status: toPrismaTaskStatus(query.status) }),
    };
    return this.paginate(where, query.limit, query.cursor);
  }

  async listAll(query: ListCrmTasksQuery): Promise<PaginatedCrmTasks> {
    const where: Prisma.CrmTaskWhereInput = {
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.status && { status: toPrismaTaskStatus(query.status) }),
      ...((query.dueBefore || query.dueAfter) && {
        dueDate: {
          ...(query.dueBefore && { lte: new Date(query.dueBefore) }),
          ...(query.dueAfter && { gte: new Date(query.dueAfter) }),
        },
      }),
    };
    return this.paginate(where, query.limit, query.cursor);
  }

  async findByIdOrThrow(id: string): Promise<CrmTask> {
    const task = await this.prisma.crmTask.findUnique({ where: { id } });
    if (!task) {
      throw new CrmTaskNotFoundException();
    }
    return toCrmTaskResponse(task);
  }

  async create(
    leadId: string,
    input: CreateCrmTaskInput,
    actorId: string | null,
  ): Promise<CrmTask> {
    await this.assertLeadExists(leadId);
    if (input.assignedToId) {
      await this.assertTeamMemberExists(input.assignedToId);
    }

    const task = await this.prisma.crmTask.create({
      data: {
        leadId,
        title: input.title,
        description: input.description ?? undefined,
        dueDate: new Date(input.dueDate),
        priority: toPrismaTaskPriority(input.priority),
        assignedToId: input.assignedToId ?? undefined,
        reminderAt: input.reminderAt ? new Date(input.reminderAt) : undefined,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? undefined,
        createdById: actorId ?? undefined,
      },
    });
    return toCrmTaskResponse(task);
  }

  async update(id: string, input: UpdateCrmTaskInput, actorId: string | null): Promise<CrmTask> {
    const current = await this.prisma.crmTask.findUnique({ where: { id } });
    if (!current) {
      throw new CrmTaskNotFoundException();
    }
    if (input.assignedToId !== undefined && input.assignedToId !== null) {
      await this.assertTeamMemberExists(input.assignedToId);
    }

    const data: Prisma.CrmTaskUncheckedUpdateInput = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.dueDate !== undefined && { dueDate: new Date(input.dueDate) }),
      ...(input.priority !== undefined && { priority: toPrismaTaskPriority(input.priority) }),
      ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
      ...(input.reminderAt !== undefined && {
        reminderAt: input.reminderAt ? new Date(input.reminderAt) : null,
      }),
      ...(input.estimatedDurationMinutes !== undefined && {
        estimatedDurationMinutes: input.estimatedDurationMinutes,
      }),
      ...(input.actualDurationMinutes !== undefined && {
        actualDurationMinutes: input.actualDurationMinutes,
      }),
    };

    if (input.status !== undefined) {
      data.status = toPrismaTaskStatus(input.status);
      if (input.status === 'completed') {
        // Idempotent: re-PATCHing an already-completed task with the same
        // status must not overwrite the original completion record.
        if (current.status !== 'COMPLETED') {
          data.completedAt = new Date();
          data.completedById = actorId ?? undefined;
        }
      } else {
        data.completedAt = null;
        data.completedById = null;
      }
    }

    const task = await this.prisma.crmTask.update({ where: { id }, data });
    return toCrmTaskResponse(task);
  }

  private async paginate(
    where: Prisma.CrmTaskWhereInput,
    limit: number,
    cursor?: string,
  ): Promise<PaginatedCrmTasks> {
    const rows = await this.prisma.crmTask.findMany({
      where,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { dueDate: 'asc' },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toCrmTaskResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
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

  private async assertTeamMemberExists(id: string): Promise<void> {
    const member = await this.teamMemberService.findById(id);
    if (!member) {
      throw new TeamMemberNotFoundException();
    }
  }
}
