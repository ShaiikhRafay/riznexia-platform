import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  createSalesStageSchema,
  listSalesStagesQuerySchema,
  updateSalesStageSchema,
  type CreateSalesStageInput,
  type ListSalesStagesQuery,
  type SalesStage,
  type UpdateSalesStageInput,
} from '@riznexia/shared-types';
import { Audited } from '../../common/decorators/audited.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SalesStageService } from './sales-stage.service';

// /crm/stages — Pipeline Engine. GET requires only `crm:view`; every
// mutation (including archive, which is a PATCH-shaped action here, not
// a real DELETE — founder's Decision 10) requires `crm:manage`.
@Controller('crm/stages')
export class SalesStageController {
  constructor(private readonly salesStageService: SalesStageService) {}

  @Get()
  @RequirePermissions('crm:view')
  async list(
    @Query(new ZodValidationPipe(listSalesStagesQuerySchema)) query: ListSalesStagesQuery,
  ): Promise<SalesStage[]> {
    return this.salesStageService.list(query);
  }

  @Post()
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.stage_created', entityType: 'SalesStage' })
  async create(
    @Body(new ZodValidationPipe(createSalesStageSchema)) body: CreateSalesStageInput,
  ): Promise<SalesStage> {
    return this.salesStageService.create(body);
  }

  @Patch(':id')
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.stage_updated', entityType: 'SalesStage' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSalesStageSchema)) body: UpdateSalesStageInput,
  ): Promise<SalesStage> {
    return this.salesStageService.update(id, body);
  }

  @Patch(':id/archive')
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.stage_archived', entityType: 'SalesStage' })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<SalesStage> {
    return this.salesStageService.archive(id);
  }
}
