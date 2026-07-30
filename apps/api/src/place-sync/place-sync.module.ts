import { Module } from '@nestjs/common';
import { WebsiteFetchAdapter } from '../common/adapters/website-fetch.adapter';
import { WebsiteStatusClassifier } from '../common/classifiers/website-status.classifier';
import { ProvidersModule } from '../common/providers/providers.module';
import { BusinessModule } from '../business/business.module';
import { LeadsModule } from '../leads/leads.module';
import { PlaceSyncController } from './place-sync.controller';
import { PlaceSyncRunnerService } from './place-sync-runner.service';
import { PlaceSyncService } from './place-sync.service';

// Module M5 — Google Places Synchronization (Doc 21 M5 entry). Depends on
// ProvidersModule for LOCATION_PROVIDER, same as DiscoveryModule — both
// modules share one provider binding rather than each wiring their own.
@Module({
  imports: [BusinessModule, LeadsModule, ProvidersModule],
  controllers: [PlaceSyncController],
  providers: [
    PlaceSyncService,
    PlaceSyncRunnerService,
    WebsiteFetchAdapter,
    WebsiteStatusClassifier,
  ],
})
export class PlaceSyncModule {}
