import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { EngineModule } from '../engine/engine.module';
import { ProviderModule } from '../provider/provider.module';
import { DashboardEngineController } from './dashboard-engine.controller';
import { DashboardEngineService } from './dashboard-engine.service';

// Module M12 — Dashboard Engine. Exported so ReportingModule can inject
// DashboardEngineService for the "executive_dashboard" report type — the
// same widget composition, not a second implementation (founder's
// explicit Decision 6). Imports ProviderModule for ANALYTICS_PROVIDER —
// every "Dashboard Viewed" is also tracked as an AnalyticsEvent.
@Module({
  imports: [EngineModule, AggregationModule, ProviderModule],
  controllers: [DashboardEngineController],
  providers: [DashboardEngineService],
  exports: [DashboardEngineService],
})
export class DashboardModule {}
