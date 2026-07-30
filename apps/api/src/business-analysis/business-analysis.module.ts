import { Module } from '@nestjs/common';
import { AiModule } from '../common/ai/ai.module';
import { BusinessModule } from '../business/business.module';
import { LeadsModule } from '../leads/leads.module';
import { BusinessAnalysisController } from './business-analysis.controller';
import { BusinessAnalysisRunnerService } from './business-analysis-runner.service';
import { BusinessAnalysisService } from './business-analysis.service';

// Module M6 — AI Business Analyzer (Doc 21 M6 entry). Depends on AiModule
// for the AiService gateway, same DI-wiring-point pattern as M5's
// ProvidersModule/LOCATION_PROVIDER.
@Module({
  imports: [BusinessModule, LeadsModule, AiModule],
  controllers: [BusinessAnalysisController],
  providers: [BusinessAnalysisService, BusinessAnalysisRunnerService],
})
export class BusinessAnalysisModule {}
