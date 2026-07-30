import { createHash } from 'node:crypto';
import type { Business } from '@riznexia/db';

// Module M6 (Implementation Rules — "compare the current business
// fingerprint with the stored fingerprint"). syncVersion (D-035) already
// increments atomically on every Places sync write, and every field listed
// in the founder's fingerprint spec (name/category/rating/reviewCount/
// website/phone/address/photos/Google sync version) is written exclusively
// through that same upsert path — so syncVersion alone is a sufficient
// change signal. The explicit field list is included anyway as a secondary
// safety net for a future write path (e.g. a manual-edit feature, D-035's
// "not built" note) that might not go through upsertByPlaceId and bump
// syncVersion.
export function computeBusinessFingerprint(business: Business): string {
  const fingerprint = {
    businessName: business.businessName,
    category: business.category,
    rating: business.rating,
    reviewCount: business.reviewCount,
    // Raw Places payload — the only place review text/snippets are stored
    // (Doc 22 §5); covers the founder's "Reviews" fingerprint field.
    placesData: business.placesData,
    websiteStatus: business.websiteStatus,
    googleBusinessUrl: business.googleBusinessUrl,
    phone: business.phone,
    address: business.address,
    photos: business.photos,
    syncVersion: business.syncVersion,
  };

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
}
