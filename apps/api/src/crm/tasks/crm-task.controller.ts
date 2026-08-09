import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import {
  listCrmTasksQuerySchema,
  updateCrmTaskSchema,
  type CrmTask,
  type ListCrmTasksQuery,
  type UpdateCrmTaskInput,
} from '@riznexia/shared-types';
import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CrmTaskService, type PaginatedCrmTasks } from './crm-task.service';

// /crm/tasks — cross-lead surface (founder's "a rep wants to see all
// their tasks across every lead" need).
@Controller('crm/tasks')
export class CrmTaskController {
  constructor(private readonly crmTaskService: CrmTaskService) {}

  @Get()
  @RequirePermissions('crm:view')
  async list(
    @Query(new ZodValidationPipe(listCrmTasksQuerySchema)) query: ListCrmTasksQuery,
  ): Promise<PaginatedCrmTasks> {
    return this.crmTaskService.listAll(query);
  }

  @Get(':id')
  @RequirePermissions('crm:view')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<CrmTask> {
    return this.crmTaskService.findByIdOrThrow(id);
  }

  @Patch(':id')
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.task_updated', entityType: 'CrmTask' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCrmTaskSchema)) body: UpdateCrmTaskInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<CrmTask> {
    return this.crmTaskService.update(id, body, user.id);
  }
}
