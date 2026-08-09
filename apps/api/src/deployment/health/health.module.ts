import { Module } from '@nestjs/common';
import { LeadsModule } from '../../leads/leads.module';
import { HealthCheckEngineController } from './health-check-engine.controller';
import { HealthCheckEngineService } from './health-check-engine.service';

// Module M11 — Health Check Engine. Deliberately does not import
// ProviderModule (founder's explicit Decision 5: independent of
// deployment providers) — its only outbound call is a plain HTTP request
// to a deployment's own `liveUrl`. Exported so `EngineModule` can inject
// it (DeploymentEngineService triggers a check right after every
// successful deploy).
@Module({
  imports: [LeadsModule],
  controllers: [HealthCheckEngineController],
  providers: [HealthCheckEngineService],
  exports: [HealthCheckEngineService],
})
export class HealthModule {}
