import { Module } from '@nestjs/common';
import { PlacesAdapter } from '../adapters/places.adapter';
import { GooglePlacesProvider } from './google-places.provider';
import { LOCATION_PROVIDER } from './location-provider.interface';

// Module M5 — the DI wiring point for the provider abstraction. Both
// DiscoveryModule (M1) and PlaceSyncModule (M5) import this rather than
// each registering their own LOCATION_PROVIDER binding, so there is exactly
// one place that decides which concrete provider backs the interface.
// Swapping in a future YelpProvider/FacebookPlacesProvider means changing
// the `useClass` line below — no consumer of LOCATION_PROVIDER changes.
@Module({
  providers: [
    PlacesAdapter,
    GooglePlacesProvider,
    { provide: LOCATION_PROVIDER, useClass: GooglePlacesProvider },
  ],
  exports: [LOCATION_PROVIDER, PlacesAdapter],
})
export class ProvidersModule {}
