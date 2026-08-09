import { Module } from '@nestjs/common';
import { LeadsModule } from '../../leads/leads.module';
import { WebsitePreviewModule } from '../../website-preview/website-preview.module';
import { HealthModule } from '../health/health.module';
import { ProviderModule } from '../provider/provider.module';
import { DeploymentEngineController } from './deployment-engine.controller';
import { DeploymentEngineService } from './deployment-engine.service';
import { DeploymentStatusController } from './deployment-status.controller';
import { DeploymentStatusService } from './deployment-status.service';

// Module M11 — Deployment Engine. Imports ProviderModule (for
// DEPLOYMENT_PROVIDER), WebsitePreviewModule (for WebsitePreviewService —
// Build Validation reads M9's already-computed PreviewReport, never
// re-runs validators), LeadsModule (lead→business resolution), and
// HealthModule (a check runs automatically right after every successful
// deploy). Exported so RollbackModule can call
// `DeploymentEngineService.deployGeneratedWebsite()` directly rather than
// duplicating the orchestration. `DeploymentStatusService` (the computed
// "DeploymentStatus" rollup) is folded in here too, same as
// WebsiteStatusService living inside the Pipeline Engine (M10).
@Module({
  imports: [LeadsModule, WebsitePreviewModule, ProviderModule, HealthModule],
  controllers: [DeploymentEngineController, DeploymentStatusController],
  providers: [DeploymentEngineService, DeploymentStatusService],
  exports: [DeploymentEngineService],
})
export class EngineModule {}
