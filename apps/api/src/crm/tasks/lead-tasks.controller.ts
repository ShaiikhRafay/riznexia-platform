import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  createCrmTaskSchema,
  listLeadTasksQuerySchema,
  type CreateCrmTaskInput,
  type CrmTask,
  type ListLeadTasksQuery,
} from '@riznexia/shared-types';
import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CrmTaskService, type PaginatedCrmTasks } from './crm-task.service';

// /leads/:id/tasks — the Task Engine's per-lead surface.
@Controller('leads/:id/tasks')
export class LeadTasksController {
  constructor(private readonly crmTaskService: CrmTaskService) {}

  @Get()
  @RequirePermissions('crm:view')
  async list(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Query(new ZodValidationPipe(listLeadTasksQuerySchema)) query: ListLeadTasksQuery,
  ): Promise<PaginatedCrmTasks> {
    return this.crmTaskService.listForLead(leadId, query);
  }

  @Post()
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.task_created', entityType: 'CrmTask' })
  async create(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(createCrmTaskSchema)) body: CreateCrmTaskInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<CrmTask> {
    return this.crmTaskService.create(leadId, body, user.id);
  }
}
