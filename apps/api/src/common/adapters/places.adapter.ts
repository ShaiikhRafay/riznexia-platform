import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamProviderException } from '../exceptions/app.exception';
import { categoryToSearchTerm } from './category-mapping';
import type { PlaceFullDetails, PlacePhoto, PlaceReview, PlacesCandidate } from './places.types';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const MAX_SEARCH_PAGES = 3; // Google's own cap: 3 pages x 20 results = 60 candidates
const PAGE_TOKEN_DELAY_MS = 2000; // a fresh pageToken is not immediately valid
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
  'nextPageToken',
];
const WEBSITE_CHECK_FIELD_MASK = ['websiteUri'];
const FULL_DETAILS_FIELD_MASK = ['websiteUri', 'rating', 'userRatingCount', 'reviews', 'photos'];

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  types?: string[];
  primaryType?: string;
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
}

interface RawErrorResponse {
  error?: { message?: string; status?: string };
}

// The only place in the codebase that calls Google Places API (New)
// directly (Doc 12 §2). Implements the tiered fetch strategy from the
// approved M1 design review (Doc 22 §9).
@Injectable()
export class PlacesAdapter {
  constructor(private readonly config: ConfigService) {}

  async searchText(params: {
    city: string;
    category: string;
    radiusKm: number;
  }): Promise<PlacesCandidate[]> {
    const textQuery = `${categoryToSearchTerm(params.category)} in ${params.city}`;
    const candidates: PlacesCandidate[] = [];
    let pageToken: string | undefined;
    let pagesFetched = 0;

    do {
      const body: { textQuery: string; pageSize: number; pageToken?: string } = {
        textQuery,
        pageSize: 20,
      };
      if (pageToken) {
        body.pageToken = pageToken;
      }

      const response = await this.request<RawSearchResponse>(
        'POST',
        '/places:searchText',
        body,
        SEARCH_FIELD_MASK,
      );

      for (const place of response.places ?? []) {
        candidates.push({
          placeId: place.id,
          displayName: place.displayName?.text ?? '',
          formattedAddress: place.formattedAddress ?? '',
          primaryType: place.primaryType ?? null,
          types: place.types ?? [],
        });
      }

      pageToken = response.nextPageToken;
      pagesFetched += 1;

      if (pageToken && pagesFetched < MAX_SEARCH_PAGES) {
        await sleep(PAGE_TOKEN_DELAY_MS);
      }
    } while (pageToken && pagesFetched < MAX_SEARCH_PAGES);

    return candidates;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
