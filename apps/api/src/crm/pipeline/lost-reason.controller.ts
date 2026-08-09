import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  createLostReasonSchema,
  listLostReasonsQuerySchema,
  updateLostReasonSchema,
  type CreateLostReasonInput,
  type ListLostReasonsQuery,
  type LostReason,
  type UpdateLostReasonInput,
} from '@riznexia/shared-types';
import { Audited } from '../../common/decorators/audited.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LostReasonService } from './lost-reason.service';

// /crm/lost-reasons — Pipeline Engine.
@Controller('crm/lost-reasons')
export class LostReasonController {
  constructor(private readonly lostReasonService: LostReasonService) {}

  @Get()
  @RequirePermissions('crm:view')
  async list(
    @Query(new ZodValidationPipe(listLostReasonsQuerySchema)) query: ListLostReasonsQuery,
  ): Promise<LostReason[]> {
    return this.lostReasonService.list(query);
  }

  @Post()
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.lost_reason_created', entityType: 'LostReason' })
  async create(
    @Body(new ZodValidationPipe(createLostReasonSchema)) body: CreateLostReasonInput,
  ): Promise<LostReason> {
    return this.lostReasonService.create(body);
  }

  @Patch(':id')
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.lost_reason_updated', entityType: 'LostReason' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLostReasonSchema)) body: UpdateLostReasonInput,
  ): Promise<LostReason> {
    return this.lostReasonService.update(id, body);
  }

  @Patch(':id/archive')
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.lost_reason_archived', entityType: 'LostReason' })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<LostReason> {
    return this.lostReasonService.archive(id);
  }
}
