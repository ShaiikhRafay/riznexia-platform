import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { LeadsModule } from '../../leads/leads.module';
import { CrmSettingsController } from './crm-settings.controller';
import { CrmSettingsService } from './crm-settings.service';
import { LeadCrmController } from './lead-crm.controller';
import { LeadCrmService } from './lead-crm.service';
import { LostReasonController } from './lost-reason.controller';
import { LostReasonService } from './lost-reason.service';
import { SalesStageController } from './sales-stage.controller';
import { SalesStageService } from './sales-stage.service';
import { WebsiteStatusController } from './website-status.controller';
import { WebsiteStatusService } from './website-status.service';

// Module M10 — Pipeline Engine (Doc 21 M10 entry). Imports `LeadsModule`
// (for `LeadActivityService`, reused per founder's Decision 5 — see
// `leads.module.ts`'s export comment) and `AuthModule` (for
// `TeamMemberService`, validating a `LeadCRM.ownerId` assignment target).
// `SalesStageService`/`LostReasonService`/`CrmSettingsService` are
// exported for `ReportingModule` to depend on (founder's Decision 6 —
// Reporting only ever aggregates facts these services compute, never
// re-derives them).
@Module({
  imports: [LeadsModule, AuthModule],
  controllers: [
    SalesStageController,
    LostReasonController,
    CrmSettingsController,
    WebsiteStatusController,
    LeadCrmController,
  ],
  providers: [
    SalesStageService,
    LostReasonService,
    CrmSettingsService,
    WebsiteStatusService,
    LeadCrmService,
  ],
  exports: [
    SalesStageService,
    LostReasonService,
    CrmSettingsService,
    WebsiteStatusService,
    LeadCrmService,
  ],
})
export class PipelineModule {}
