import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { LeadsModule } from '../../leads/leads.module';
import { CrmTaskController } from './crm-task.controller';
import { CrmTaskService } from './crm-task.service';
import { LeadTasksController } from './lead-tasks.controller';

// Module M10 — Task Engine. Imports `AuthModule` for `TeamMemberService`
// (validating a task's `assignedToId`) and `LeadsModule` purely for the
// `leadId` existence check (never `LeadsService` methods directly — a
// lightweight `prisma.lead.findUnique`, same as the Pipeline Engine's own
// `getOrCreate`). `CrmTaskService` is exported for `ReportingModule`
// (founder's Decision 6 — aggregation only, never re-derived facts).
@Module({
  imports: [LeadsModule, AuthModule],
  controllers: [LeadTasksController, CrmTaskController],
  providers: [CrmTaskService],
  exports: [CrmTaskService],
})
export class TaskModule {}
