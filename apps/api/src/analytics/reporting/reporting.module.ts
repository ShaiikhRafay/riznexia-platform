import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { EngineModule } from '../engine/engine.module';
import { ProviderModule } from '../provider/provider.module';
import { ReportingEngineController } from './reporting-engine.controller';
import { ReportingEngineService } from './reporting-engine.service';

// Module M12 — Reporting Engine. Imports DashboardModule only for the
// "executive_dashboard" report type's shared composition (founder's
// Decision 6) — DashboardModule never imports this module back, keeping
// the dependency direction one-way. Imports ProviderModule for
// ANALYTICS_PROVIDER — every "Report Generated" is also tracked.
@Module({
  imports: [EngineModule, AggregationModule, DashboardModule, ProviderModule],
  controllers: [ReportingEngineController],
  providers: [ReportingEngineService],
  exports: [ReportingEngineService],
})
export class ReportingModule {}
