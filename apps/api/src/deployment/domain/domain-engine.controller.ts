import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { createDomainSchema, type CreateDomainInput, type Domain } from '@riznexia/shared-types';
import { Audited } from '../../common/decorators/audited.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DomainEngineService } from './domain-engine.service';

// /leads/:id/domains — the Domain Engine's per-lead surface. Metadata
// and provider-integration status only (founder's explicit Decision 6) —
// no DELETE this phase (a hostname is rarely un-registered, and nothing
// in the founder's brief asked for it).
@Controller('leads/:id/domains')
export class DomainEngineController {
  constructor(private readonly domainEngineService: DomainEngineService) {}

  @Get()
  @RequirePermissions('deployment:view')
  async list(@Param('id', ParseUUIDPipe) leadId: string): Promise<Domain[]> {
    return this.domainEngineService.listForLead(leadId);
  }

  @Get(':domainId')
  @RequirePermissions('deployment:view')
  async getById(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<Domain> {
    return this.domainEngineService.findByIdOrThrow(leadId, domainId);
  }

  @Post()
  @RequirePermissions('deployment:manage')
  @Audited({ action: 'deployment.domain_registered', entityType: 'Domain' })
  async create(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(createDomainSchema)) body: CreateDomainInput,
  ): Promise<Domain> {
    return this.domainEngineService.create(leadId, body);
  }

  @Post(':domainId/verify')
  @RequirePermissions('deployment:manage')
  @Audited({
    action: 'deployment.domain_verify_requested',
    entityType: 'Domain',
    entityIdParam: 'domainId',
  })
  async verify(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<Domain> {
    return this.domainEngineService.verify(leadId, domainId);
  }
}
