import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { PlacesAdapter } from '../adapters/places.adapter';
import type { PlacesCandidate } from '../adapters/places.types';
import type {
  LocationCandidate,
  LocationDetails,
  LocationProvider,
  LocationSearchPage,
  LocationSearchParams,
} from './location-provider.interface';

// Module M5 — the only concrete LocationProvider implementation today.
// Wraps PlacesAdapter (the sole caller of Google Places API (New)) and
// translates between Google's shapes and the provider-agnostic
// LocationCandidate/LocationDetails shapes. Business logic
// (DiscoveryRunnerService, PlaceSyncRunnerService) never imports this class
// directly — it's registered behind the LOCATION_PROVIDER DI token.
@Injectable()
export class GooglePlacesProvider implements LocationProvider {
  readonly name = 'GOOGLE';

  constructor(private readonly placesAdapter: PlacesAdapter) {}

  async search(params: LocationSearchParams): Promise<LocationSearchPage> {
    if (params.latitude !== undefined && params.longitude !== undefined) {
      const page = await this.placesAdapter.searchNearby({
        latitude: params.latitude,
        longitude: params.longitude,
        radiusMeters: params.radiusMeters ?? 15_000,
        category: params.category,
        pageToken: params.pageToken,
      });
      return {
        candidates: page.candidates.map(toLocationCandidate),
        nextPageToken: page.nextPageToken,
      };
    }

    if (!params.city) {
      throw new BadRequestException(
        'search() requires either city (text search) or latitude+longitude (nearby search)',
      );
    }

    const page = await this.placesAdapter.searchText({
      city: params.city,
      category: params.category,
      keyword: params.keyword,
      pageToken: params.pageToken,
    });
    return {
      candidates: page.candidates.map(toLocationCandidate),
      nextPageToken: page.nextPageToken,
    };
  }

  async getWebsiteUri(providerId: string): Promise<string | null> {
    return this.placesAdapter.getWebsiteUri(providerId);
  }

  async getDetails(providerId: string): Promise<LocationDetails> {
    const details = await this.placesAdapter.getFullDetails(providerId);
    return {
      websiteUri: details.websiteUri,
      phone: details.phone,
      rating: details.rating,
      userRatingCount: details.userRatingCount,
      latitude: details.latitude,
      longitude: details.longitude,
      openingHours: details.openingHours,
      photos: details.photos,
      reviews: details.reviews,
      businessStatus: toLocationBusinessStatus(details.businessStatus),
      profileUrl: details.googleMapsUri,
    };
  }
}

function toLocationCandidate(candidate: PlacesCandidate): LocationCandidate {
  return {
    providerId: candidate.placeId,
    displayName: candidate.displayName,
    formattedAddress: candidate.formattedAddress,
    primaryType: candidate.primaryType,
    types: candidate.types,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  };
}

function toLocationBusinessStatus(raw: string | null): LocationDetails['businessStatus'] {
  switch (raw) {
    case 'OPERATIONAL':
      return 'OPERATIONAL';
    case 'CLOSED_TEMPORARILY':
      return 'CLOSED_TEMPORARILY';
    case 'CLOSED_PERMANENTLY':
      return 'CLOSED_PERMANENTLY';
    default:
      return null;
  }
}
