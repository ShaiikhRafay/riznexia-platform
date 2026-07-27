import { Module } from '@nestjs/common';
import { PlacesAdapter } from '../common/adapters/places.adapter';
import { WebsiteFetchAdapter } from '../common/adapters/website-fetch.adapter';
import { WebsiteStatusClassifier } from '../common/classifiers/website-status.classifier';
import { LeadsModule } from '../leads/leads.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryRunnerService } from './discovery-runner.service';
import { DiscoveryService } from './discovery.service';

@Module({
  imports: [LeadsModule],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    DiscoveryRunnerService,
    PlacesAdapter,
    WebsiteFetchAdapter,
    WebsiteStatusClassifier,
  ],
})
export class DiscoveryModule {}
