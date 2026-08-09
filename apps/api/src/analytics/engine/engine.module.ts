import { Module } from '@nestjs/common';
import { ReportingModule } from '../../crm/reporting/reporting.module';
import { AggregationModule } from '../aggregation/aggregation.module';
import { AnalyticsEngineService } from './analytics-engine.service';

// Module M12 — Analytics Engine. Imports ReportingModule (M10) for
// ReportingService — the Sales CRM/Sales Performance domain is a direct
// passthrough, never re-derived (founder's Decision 2) — and
// AggregationModule for the shared time-bucketing utility. `CostService`
// needs no import: `CostModule` is `@Global()`.
@Module({
  imports: [ReportingModule, AggregationModule],
  providers: [AnalyticsEngineService],
  exports: [AnalyticsEngineService],
})
export class EngineModule {}
