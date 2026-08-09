import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  assignLeadOwnerSchema,
  transitionLeadStageSchema,
  updateLeadCrmSchema,
  type AssignLeadOwnerInput,
  type LeadCRM,
  type TransitionLeadStageInput,
  type UpdateLeadCrmInput,
} from '@riznexia/shared-types';
import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LeadCrmService } from './lead-crm.service';

// /leads/:id/crm[...] — the Pipeline Engine's per-lead surface. Stage
// transitions and owner assignment are dedicated actions (never folded
// into a generic PATCH), each independently permission-gated and each
// producing its own clean `LeadActivity` row.
@Controller('leads/:id/crm')
export class LeadCrmController {
  constructor(private readonly leadCrmService: LeadCrmService) {}

  @Get()
  @RequirePermissions('crm:view')
  async get(@Param('id', ParseUUIDPipe) leadId: string): Promise<LeadCRM> {
    return this.leadCrmService.getForLead(leadId);
  }

  @Patch()
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.lead_updated', entityType: 'Lead', entityIdParam: 'id' })
  async update(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(updateLeadCrmSchema)) body: UpdateLeadCrmInput,
  ): Promise<LeadCRM> {
    return this.leadCrmService.update(leadId, body);
  }

  @Post('stage')
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.stage_changed', entityType: 'Lead', entityIdParam: 'id' })
  async transitionStage(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(transitionLeadStageSchema)) body: TransitionLeadStageInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<LeadCRM> {
    return this.leadCrmService.transitionStage(leadId, body, user.id);
  }

  @Post('owner')
  @RequirePermissions('crm:assign')
  @Audited({ action: 'crm.owner_assigned', entityType: 'Lead', entityIdParam: 'id' })
  async assignOwner(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(assignLeadOwnerSchema)) body: AssignLeadOwnerInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<LeadCRM> {
    return this.leadCrmService.assignOwner(leadId, body, user.id);
  }
}
