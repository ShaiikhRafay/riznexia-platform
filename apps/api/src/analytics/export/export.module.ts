import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { ReportingModule } from '../reporting/reporting.module';
import { ExportEngineController } from './export-engine.controller';
import { ExportEngineService } from './export-engine.service';

// Module M12 — Export Engine. Imports ReportingModule so every export
// runs the exact same report computation the JSON endpoint uses — never
// a second, parallel report implementation. Imports ProviderModule for
// ANALYTICS_PROVIDER — every "Export Started"/"Export Completed" is also
// tracked.
@Module({
  imports: [ReportingModule, ProviderModule],
  controllers: [ExportEngineController],
  providers: [ExportEngineService],
})
export class ExportModule {}
