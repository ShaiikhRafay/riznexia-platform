import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  updateCrmSettingsSchema,
  type CrmSettings,
  type UpdateCrmSettingsInput,
} from '@riznexia/shared-types';
import { Audited } from '../../common/decorators/audited.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CrmSettingsService } from './crm-settings.service';

// /crm/settings — a singleton, so GET/PATCH only, no id param, no
// create/delete (founder's Decision 12).
@Controller('crm/settings')
export class CrmSettingsController {
  constructor(private readonly crmSettingsService: CrmSettingsService) {}

  @Get()
  @RequirePermissions('crm:view')
  async get(): Promise<CrmSettings> {
    return this.crmSettingsService.get();
  }

  @Patch()
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.settings_updated', entityType: 'CrmSettings' })
  async update(
    @Body(new ZodValidationPipe(updateCrmSettingsSchema)) body: UpdateCrmSettingsInput,
  ): Promise<CrmSettings> {
    return this.crmSettingsService.update(body);
  }
}
