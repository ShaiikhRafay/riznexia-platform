// Module M5 (DECISIONS.md D-033) — the provider-agnostic contract every
// location/business-discovery provider implements. Business logic
// (DiscoveryRunnerService, PlaceSyncRunnerService) depends only on this
// interface, never on a concrete provider like GooglePlacesProvider — see
// the M5 brief's explicit mandate. A future YelpProvider/FacebookPlacesProvider/
// FoursquareProvider implements the same shape; CSVImportProvider is flagged
// as a probable future exception (file-based ingestion doesn't fit
// search()/getDetails() cleanly) but is out of scope for M5.

export const LOCATION_PROVIDER = Symbol('LOCATION_PROVIDER');

// One page per call, deliberately — callers own their own page-loop (and
// its cap/delay/progress-tracking), matching this codebase's existing
// cursor-based pagination convention rather than an adapter that loops
// internally and hides page-by-page control from the caller.
export interface LocationSearchParams {
  city?: string;
  category?: string;
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  pageToken?: string;
}

export interface LocationCandidate {
  providerId: string;
  displayName: string;
  formattedAddress: string;
  primaryType: string | null;
  types: string[];
  latitude: number | null;
  longitude: number | null;
}

export interface LocationSearchPage {
  candidates: LocationCandidate[];
  nextPageToken?: string;
}

export type LocationBusinessStatus = 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

export interface LocationReview {
  rating: number | null;
  text: string | null;
  publishTime: string | null;
}

export interface LocationPhoto {
  name: string;
}

export interface LocationDetails {
  websiteUri: string | null;
  phone: string | null;
  rating: number | null;
  userRatingCount: number | null;
  latitude: number | null;
  longitude: number | null;
  // Provider-shaped (e.g. Google's `regularOpeningHours`) — stored as-is in
  // Business.openingHours (Json). No provider-agnostic normalization is
  // attempted; nothing downstream parses this today.
  openingHours: unknown | null;
  photos: LocationPhoto[];
  reviews: LocationReview[];
  businessStatus: LocationBusinessStatus | null;
  // The provider's own listing/profile page (Google Maps URL, a Yelp
  // listing page, etc). Named generically here — the Google-specific
  // `Business.googleBusinessUrl` column name is a write-boundary mapping
  // detail, not part of this interface (see business.service.ts).
  profileUrl: string | null;
}

export interface LocationProvider {
  readonly name: string;
  search(params: LocationSearchParams): Promise<LocationSearchPage>;
  /** Cheapest tier — just enough to determine website presence. */
  getWebsiteUri(providerId: string): Promise<string | null>;
  /** Richer tier — only called for candidates that already qualify. */
  getDetails(providerId: string): Promise<LocationDetails>;
}
