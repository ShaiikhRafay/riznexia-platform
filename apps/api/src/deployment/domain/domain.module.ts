import { Module } from '@nestjs/common';
import { LeadsModule } from '../../leads/leads.module';
import { ProviderModule } from '../provider/provider.module';
import { DomainEngineController } from './domain-engine.controller';
import { DomainEngineService } from './domain-engine.service';

// Module M11 — Domain Engine. Imports ProviderModule for
// DEPLOYMENT_PROVIDER (the optional `attachDomain` integration point) and
// LeadsModule for lead→business resolution.
@Module({
  imports: [LeadsModule, ProviderModule],
  controllers: [DomainEngineController],
  providers: [DomainEngineService],
})
export class DomainModule {}
