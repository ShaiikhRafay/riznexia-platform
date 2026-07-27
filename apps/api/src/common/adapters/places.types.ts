// Shapes we actually use from Google Places API (New) responses — not a
// full mirror of Google's schema, just the fields each fetch tier reads
// (Doc 22 §9's three-tier strategy).

export interface PlacesCandidate {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  primaryType: string | null;
  types: string[];
}

export interface PlaceReview {
  rating: number | null;
  text: string | null;
  publishTime: string | null;
}

export interface PlacePhoto {
  name: string;
}

export interface PlaceFullDetails {
  websiteUri: string | null;
  rating: number | null;
  userRatingCount: number | null;
  reviews: PlaceReview[];
  photos: PlacePhoto[];
}
