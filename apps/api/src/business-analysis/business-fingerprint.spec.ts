import { BusinessOperatingStatus, BusinessSourceProvider, WebsiteStatusType } from '@riznexia/db';
import type { Business } from '@riznexia/db';
import { computeBusinessFingerprint } from './business-fingerprint';

function fakeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 'business-1',
    googlePlaceId: 'place-1',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    placesData: { reviews: ['Great food!'] },
    websiteStatus: WebsiteStatusType.NONE,
    latitude: null,
    longitude: null,
    phone: '+92-300-0000000',
    rating: 4.5,
    reviewCount: 120,
    openingHours: null,
    photos: null,
    businessStatus: BusinessOperatingStatus.OPERATIONAL,
    googleBusinessUrl: null,
    websiteDetectedAt: null,
    websiteDetectionMethod: null,
    syncVersion: 1,
    sourceProvider: BusinessSourceProvider.GOOGLE,
    lastSyncedAt: null,
    lastSyncJobId: null,
    discoveryJobId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  } as Business;
}

describe('computeBusinessFingerprint', () => {
  it('is deterministic for the same business data', () => {
    const business = fakeBusiness();
    expect(computeBusinessFingerprint(business)).toBe(computeBusinessFingerprint(fakeBusiness()));
  });

  it('changes when syncVersion increments (a Places sync ran)', () => {
    const before = computeBusinessFingerprint(fakeBusiness({ syncVersion: 1 }));
    const after = computeBusinessFingerprint(fakeBusiness({ syncVersion: 2 }));
    expect(before).not.toBe(after);
  });

  it('changes when rating changes', () => {
    const before = computeBusinessFingerprint(fakeBusiness({ rating: 4.5 }));
    const after = computeBusinessFingerprint(fakeBusiness({ rating: 4.7 }));
    expect(before).not.toBe(after);
  });

  it('changes when placesData (raw payload, incl. reviews) changes', () => {
    const before = computeBusinessFingerprint(fakeBusiness({ placesData: { reviews: ['A'] } }));
    const after = computeBusinessFingerprint(fakeBusiness({ placesData: { reviews: ['A', 'B'] } }));
    expect(before).not.toBe(after);
  });

  it('does not change when an unrelated field (e.g. updatedAt) changes', () => {
    const before = computeBusinessFingerprint(
      fakeBusiness({ updatedAt: new Date('2026-01-01T00:00:00Z') }),
    );
    const after = computeBusinessFingerprint(
      fakeBusiness({ updatedAt: new Date('2026-06-01T00:00:00Z') }),
    );
    expect(before).toBe(after);
  });
});
