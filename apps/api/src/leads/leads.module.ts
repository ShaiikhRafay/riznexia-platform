import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessModule } from '../business/business.module';
import { LeadActivityService } from './lead-activity.service';
import { LeadNotesService } from './lead-notes.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

// Module M4: imports BusinessModule (validating a Lead's businessId,
// already a Module M2 dependency of DiscoveryModule) and AuthModule
// (validating an `assignedTo` team member id, new in this module).
@Module({
  imports: [BusinessModule, AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadActivityService, LeadNotesService],
  exports: [LeadsService], // consumed by DiscoveryModule's write path (Doc 22 §14)
})
export class LeadsModule {}
