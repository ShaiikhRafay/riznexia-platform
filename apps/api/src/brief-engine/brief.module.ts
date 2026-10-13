import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { LeadsModule } from '../leads/leads.module';
import { BriefController } from './brief.controller';
import { BriefService } from './brief.service';

// BRIEF.md hand-off module. Same imports as ContentEngineModule (Business +
// Leads); generateBrief() is a pure function, not a registered provider.
@Module({
  imports: [BusinessModule, LeadsModule],
  controllers: [BriefController],
  providers: [BriefService],
  exports: [BriefService],
})
export class BriefModule {}
