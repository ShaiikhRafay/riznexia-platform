import type { Business } from '@riznexia/db';
import type { BusinessContactInfo } from '@riznexia/shared-types';

// Maps the M2/M5 `Business` record onto the minimal contact-info shape
// Content Binding needs (DECISIONS.md D-062) — the one additional input
// beyond the phase brief's stated four, since Contact Information/Business
// Hours/Gallery References/LocalBusiness structured data all need real
// Business fields that BusinessAnalysis's brandBrief doesn't carry.
// `photos` is Places-shaped `{name: string}[]` Json at the DB layer
// (apps/api/src/common/adapters/places.types.ts's `PlacePhoto`) — mapped
// onto `{photoReference}[]` here, defensively, since it's opaque untyped
// storage. `openingHours` stays fully opaque (no stable typed contract
// anywhere in this codebase) and passes through verbatim.
export function toBusinessContactInfo(business: Business): BusinessContactInfo {
  return {
    businessName: business.businessName,
    address: business.address,
    city: business.city,
    phone: business.phone,
    photos: toPhotoReferences(business.photos),
    openingHours: business.openingHours,
    rating: business.rating,
    reviewCount: business.reviewCount,
    googleBusinessUrl: business.googleBusinessUrl,
    latitude: business.latitude ? Number(business.latitude) : null,
    longitude: business.longitude ? Number(business.longitude) : null,
  };
}

function toPhotoReferences(photos: unknown): { photoReference: string }[] | null {
  if (!Array.isArray(photos) || photos.length === 0) {
    return null;
  }
  const references = photos
    .map((photo) =>
      photo && typeof photo === 'object' && 'name' in photo && typeof photo.name === 'string'
        ? photo.name
        : null,
    )
    .filter((name): name is string => name !== null)
    .map((name) => ({ photoReference: name }));
  return references.length > 0 ? references : null;
}
