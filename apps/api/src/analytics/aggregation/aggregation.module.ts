import { Module } from '@nestjs/common';
import { AggregationEngineService } from './aggregation-engine.service';

// Module M12 — Aggregation Engine. No HTTP surface of its own (no
// controller) — it's a shared utility injected by Reporting/Dashboard/
// Export, exported so every consumer shares the exact same bucketing
// logic rather than each reimplementing date math (founder's explicit
// Decision 5).
@Module({
  providers: [AggregationEngineService],
  exports: [AggregationEngineService],
})
export class AggregationModule {}
