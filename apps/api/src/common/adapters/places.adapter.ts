import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamProviderException } from '../exceptions/app.exception';
import { categoryToSearchTerm } from './category-mapping';
import type {
  PlaceFullDetails,
  PlacePhoto,
  PlaceReview,
  PlacesCandidate,
  PlacesSearchPage,
} from './places.types';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const REQUEST_TIMEOUT_MS = 10_000;

// Cheapest tier field masks first, richer ones only when justified —
// Doc 22 §9's three-tier strategy. Exact SKU/pricing implications of each
// mask should be reconfirmed against Google's current pricing page before
// this goes live for real spend (Doc 22 §9's own caveat, DECISIONS.md D-007).
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.types',
  'places.primaryType',
  'places.location',
  'nextPageToken',
];
const WEBSITE_CHECK_FIELD_MASK = ['websiteUri'];
// Module M5 — widened to cover the Business fields this module promotes to
// real columns: phone, coordinates, opening hours, operating status, and
// the Google Maps listing URL (googleBusinessUrl).
const FULL_DETAILS_FIELD_MASK = [
  'websiteUri',
  'rating',
  'userRatingCount',
  'reviews',
  'photos',
  'internationalPhoneNumber',
  'location',
  'regularOpeningHours',
  'businessStatus',
  'googleMapsUri',
];

interface RawLocation {
  latitude?: number;
  longitude?: number;
}

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  types?: string[];
  primaryType?: string;
  location?: RawLocation;
}

interface RawSearchResponse {
  places?: RawPlace[];
  nextPageToken?: string;
}

interface RawReview {
  rating?: number;
  text?: { text?: string };
  publishTime?: string;
}

interface RawPhoto {
  name: string;
}

interface RawDetailsResponse {
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  reviews?: RawReview[];
  photos?: RawPhoto[];
  internationalPhoneNumber?: string;
  location?: RawLocation;
  regularOpeningHours?: unknown;
  businessStatus?: string;
  googleMapsUri?: string;
}

interface RawErrorResponse {
  error?: { message?: string; status?: string };
}

// The only place in the codebase that calls Google Places API (New)
// directly (Doc 12 §2). Implements the tiered fetch strategy from the
// approved M1 design review (Doc 22 §9). Module M5: no longer owns
// multi-page looping — `searchText`/`searchNearby` each fetch exactly one
// page per call (a `pageToken` in, a `nextPageToken` out); the caller
// (GooglePlacesProvider) owns the loop, its cap, and the inter-page delay,
// matching the `LocationProvider.search()` one-page-per-call contract.
@Injectable()
export class PlacesAdapter {
  constructor(private readonly config: ConfigService) {}

  async searchText(params: {
    city: string;
    category?: string;
    keyword?: string;
    pageToken?: string;
  }): Promise<PlacesSearchPage> {
    const term = params.keyword ?? categoryToSearchTerm(params.category ?? '');
    const textQuery = `${term} in ${params.city}`;
    const body: { textQuery: string; pageSize: number; pageToken?: string } = {
      textQuery,
      pageSize: 20,
    };
    if (params.pageToken) {
      body.pageToken = params.pageToken;
    }

    const response = await this.request<RawSearchResponse>(
      'POST',
      '/places:searchText',
      body,
      SEARCH_FIELD_MASK,
    );
    return toSearchPage(response);
  }

  /** Google's coordinate-based search endpoint (Doc 21 M5 — "search by coordinates/radius"). */
  async searchNearby(params: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    category?: string;
    pageToken?: string;
  }): Promise<PlacesSearchPage> {
    const body: {
      locationRestriction: {
        circle: { center: { latitude: number; longitude: number }; radius: number };
      };
      includedTypes?: string[];
      maxResultCount: number;
    } = {
      locationRestriction: {
        circle: {
          center: { latitude: params.latitude, longitude: params.longitude },
          radius: params.radiusMeters,
        },
      },
      maxResultCount: 20,
    };
    if (params.category) {
      body.includedTypes = [params.category];
    }

    // Google's Nearby Search (New) doesn't take a `pageToken` request field
    // the way Text Search does — it returns at most `maxResultCount` in one
    // response and has no continuation token. Kept as an explicit no-op
    // parameter (rather than omitted) so the caller's page-loop can still
    // treat this uniformly with searchText's page shape.
    void params.pageToken;

    const response = await this.request<RawSearchResponse>(
      'POST',
      '/places:searchNearby',
      body,
      SEARCH_FIELD_MASK,
    );
    return toSearchPage(response);
  }

  /** Cheapest Details tier — used for every candidate to determine website_status. */
  async getWebsiteUri(placeId: string): Promise<string | null> {
    const response = await this.request<RawDetailsResponse>(
      'GET',
      `/places/${encodeURIComponent(placeId)}`,
      undefined,
      WEBSITE_CHECK_FIELD_MASK,
    );
    return response.websiteUri ?? null;
  }

  /** Richer Details tier — only called for candidates that already qualify (none/outdated). */
  async getFullDetails(placeId: string): Promise<PlaceFullDetails> {
    const response = await this.request<RawDetailsResponse>(
      'GET',
      `/places/${encodeURIComponent(placeId)}`,
      undefined,
      FULL_DETAILS_FIELD_MASK,
    );

    const reviews: PlaceReview[] = (response.reviews ?? []).map((review) => ({
      rating: review.rating ?? null,
      text: review.text?.text ?? null,
      publishTime: review.publishTime ?? null,
    }));
    const photos: PlacePhoto[] = (response.photos ?? []).map((photo) => ({ name: photo.name }));

    return {
      websiteUri: response.websiteUri ?? null,
      rating: response.rating ?? null,
      userRatingCount: response.userRatingCount ?? null,
      reviews,
      photos,
      phone: response.internationalPhoneNumber ?? null,
      latitude: response.location?.latitude ?? null,
      longitude: response.location?.longitude ?? null,
      openingHours: response.regularOpeningHours ?? null,
      businessStatus: response.businessStatus ?? null,
      googleMapsUri: response.googleMapsUri ?? null,
    };
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    fieldMask: string[],
  ): Promise<T> {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new UpstreamProviderException('Google Places', 'API key not configured');
    }

    let response: Response;
    try {
      response = await fetch(`${PLACES_API_BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask.join(','),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new UpstreamProviderException('Google Places', 'Network error or timeout', {
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as RawErrorResponse;
      const message = errorBody.error?.message ?? `HTTP ${response.status}`;

      // 400 = malformed request (bad city/category) — not retryable,
      // surfaces to the rep immediately (Doc 22 §10).
      if (response.status === 400) {
        throw new BadRequestException(message);
      }
      throw new UpstreamProviderException('Google Places', message, { status: response.status });
    }

    return response.json() as Promise<T>;
  }
}

function toSearchPage(response: RawSearchResponse): PlacesSearchPage {
  const candidates: PlacesCandidate[] = (response.places ?? []).map((place) => ({
    placeId: place.id,
    displayName: place.displayName?.text ?? '',
    formattedAddress: place.formattedAddress ?? '',
    primaryType: place.primaryType ?? null,
    types: place.types ?? [],
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
  }));
  return { candidates, nextPageToken: response.nextPageToken };
}
