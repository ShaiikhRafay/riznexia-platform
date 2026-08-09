import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

// Module M10 — Reporting Engine. No imports from the other four CRM
// modules: it reads `leadCRM`/`leadActivity` directly via the global
// PRISMA_CLIENT (DECISIONS.md D-086/D-089 — see ReportingService's own
// doc comment for why that still honors founder's Decision 6).
//
// Module M12 — `ReportingService` is exported so the Analytics Engine can
// call `getDashboardStats()` directly for the Sales CRM/Sales Performance
// domain, never re-deriving win/conversion math a second time
// (DECISIONS.md D-104, founder's explicit Decision 2).
@Module({
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
