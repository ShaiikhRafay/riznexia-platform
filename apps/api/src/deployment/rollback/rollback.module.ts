import { Module } from '@nestjs/common';
import { LeadsModule } from '../../leads/leads.module';
import { EngineModule } from '../engine/engine.module';
import { RollbackEngineController } from './rollback-engine.controller';
import { RollbackEngineService } from './rollback-engine.service';

// Module M11 — Rollback Engine. Imports EngineModule for
// DeploymentEngineService (rollback delegates to
// `deployGeneratedWebsite()` rather than duplicating the deploy
// orchestration) and LeadsModule for lead→business resolution.
@Module({
  imports: [LeadsModule, EngineModule],
  controllers: [RollbackEngineController],
  providers: [RollbackEngineService],
})
export class RollbackModule {}
