// Shapes we actually use from Google Places API (New) responses — not a
// full mirror of Google's schema, just the fields each fetch tier reads
// (Doc 22 §9's three-tier strategy).

export interface PlacesCandidate {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  primaryType: string | null;
  types: string[];
  latitude: number | null;
  longitude: number | null;
}

export interface PlacesSearchPage {
  candidates: PlacesCandidate[];
  nextPageToken?: string;
}

export interface PlaceReview {
  rating: number | null;
  text: string | null;
  publishTime: string | null;
}

export interface PlacePhoto {
  name: string;
}

// Module M5 — widened from the M1-era shape to cover the Business fields
// this module promotes to real columns (Doc 21 M5 entry).
export interface PlaceFullDetails {
  websiteUri: string | null;
  rating: number | null;
  userRatingCount: number | null;
  reviews: PlaceReview[];
  photos: PlacePhoto[];
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: unknown | null;
  businessStatus: string | null;
  googleMapsUri: string | null;
}
