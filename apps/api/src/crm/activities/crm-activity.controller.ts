import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { logLeadActivitySchema, type LogLeadActivityInput } from '@riznexia/shared-types';
import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CrmActivityService } from './crm-activity.service';

// POST /leads/:id/activity — manual logging of the four interaction types
// a rep can genuinely originate by hand. Reading the timeline stays on
// LeadsController's existing `GET /leads/:id/activity` (Module M4); this
// is a sibling write-only route owned by the CRM's Activity Engine.
@Controller('leads/:id/activity')
export class CrmActivityController {
  constructor(private readonly crmActivityService: CrmActivityService) {}

  @Post()
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.activity_logged', entityType: 'Lead', entityIdParam: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async log(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(logLeadActivitySchema)) body: LogLeadActivityInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<void> {
    await this.crmActivityService.logManualActivity(leadId, body, user.id);
  }
}
