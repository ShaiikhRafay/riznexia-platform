import { Module } from '@nestjs/common';
import { LeadsModule } from '../../leads/leads.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { CrmActivityController } from './crm-activity.controller';
import { CrmActivityService } from './crm-activity.service';

// Module M10 — Activity Engine. Imports `LeadsModule` for
// `LeadActivityService` (founder's Decision 5) and `PipelineModule` for
// `LeadCrmService` (lazy get-or-create + the `lastActivityAt` touch this
// engine owns).
@Module({
  imports: [LeadsModule, PipelineModule],
  controllers: [CrmActivityController],
  providers: [CrmActivityService],
})
export class ActivityModule {}
