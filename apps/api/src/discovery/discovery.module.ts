import { Module } from '@nestjs/common';
import { WebsiteFetchAdapter } from '../common/adapters/website-fetch.adapter';
import { WebsiteStatusClassifier } from '../common/classifiers/website-status.classifier';
import { ProvidersModule } from '../common/providers/providers.module';
import { BusinessModule } from '../business/business.module';
import { LeadsModule } from '../leads/leads.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryRunnerService } from './discovery-runner.service';
import { DiscoveryService } from './discovery.service';

// Module M5 (DECISIONS.md D-033+): depends on ProvidersModule for
// LOCATION_PROVIDER rather than providing PlacesAdapter directly —
// DiscoveryRunnerService is injected with the interface, never the
// concrete Google implementation (AskUserQuestion resolution: "apply the
// rule everywhere, including M1").
@Module({
  imports: [BusinessModule, LeadsModule, ProvidersModule],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    DiscoveryRunnerService,
    WebsiteFetchAdapter,
    WebsiteStatusClassifier,
  ],
})
export class DiscoveryModule {}
