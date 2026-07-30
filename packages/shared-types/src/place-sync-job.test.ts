import { describe, expect, it } from 'vitest';
import { createPlaceSyncJobSchema, placeSyncJobSchema } from './place-sync-job';

describe('placeSyncJobSchema', () => {
  it('accepts a well-formed job', () => {
    const result = placeSyncJobSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      provider: 'google',
      city: 'Karachi',
      category: 'restaurant',
      keyword: null,
      latitude: null,
      longitude: null,
      radiusMeters: 15000,
      status: 'completed',
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:05:00.000Z',
      duration: 300,
      successRate: 1,
      apiCallsUsed: 5,
      estimatedCost: 0.25,
      businessesFound: 5,
      businessesCreated: 3,
      businessesUpdated: 2,
      businessesFailed: 0,
      errorMessage: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a status outside the documented enum', () => {
    const result = placeSyncJobSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      provider: 'google',
      city: 'Karachi',
      category: 'restaurant',
      keyword: null,
      latitude: null,
      longitude: null,
      radiusMeters: 15000,
      status: 'pending',
      startedAt: null,
      finishedAt: null,
      duration: null,
      successRate: null,
      apiCallsUsed: 0,
      estimatedCost: 0,
      businessesFound: 0,
      businessesCreated: 0,
      businessesUpdated: 0,
      businessesFailed: 0,
      errorMessage: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts PARTIAL — a distinct outcome from completed/failed', () => {
    const result = placeSyncJobSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      provider: 'google',
      city: 'Karachi',
      category: 'restaurant',
      keyword: null,
      latitude: null,
      longitude: null,
      radiusMeters: 15000,
      status: 'partial',
      startedAt: null,
      finishedAt: null,
      duration: null,
      successRate: 0.5,
      apiCallsUsed: 2,
      estimatedCost: 0.1,
      businessesFound: 2,
      businessesCreated: 1,
      businessesUpdated: 0,
      businessesFailed: 1,
      errorMessage: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a provider outside the documented enum', () => {
    const result = placeSyncJobSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      provider: 'bing',
      city: 'Karachi',
      category: 'restaurant',
      keyword: null,
      latitude: null,
      longitude: null,
      radiusMeters: 15000,
      status: 'queued',
      startedAt: null,
      finishedAt: null,
      duration: null,
      successRate: null,
      apiCallsUsed: 0,
      estimatedCost: 0,
      businessesFound: 0,
      businessesCreated: 0,
      businessesUpdated: 0,
      businessesFailed: 0,
      errorMessage: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('createPlaceSyncJobSchema', () => {
  it('accepts a city + category search', () => {
    const result = createPlaceSyncJobSchema.safeParse({ city: 'Karachi', category: 'restaurant' });
    expect(result.success).toBe(true);
  });

  it('accepts a coordinates search without a city', () => {
    const result = createPlaceSyncJobSchema.safeParse({ latitude: 24.86, longitude: 67.01 });
    expect(result.success).toBe(true);
  });

  it('defaults radiusMeters to 15000 when omitted', () => {
    const result = createPlaceSyncJobSchema.parse({ latitude: 24.86, longitude: 67.01 });
    expect(result.radiusMeters).toBe(15_000);
  });

  it('rejects when neither city nor coordinates are given', () => {
    expect(createPlaceSyncJobSchema.safeParse({ category: 'restaurant' }).success).toBe(false);
  });

  it('rejects a city search with neither category nor keyword', () => {
    expect(createPlaceSyncJobSchema.safeParse({ city: 'Karachi' }).success).toBe(false);
  });

  it('accepts a city search with only keyword (no category)', () => {
    expect(
      createPlaceSyncJobSchema.safeParse({ city: 'Karachi', keyword: 'coffee shop' }).success,
    ).toBe(true);
  });

  it('rejects latitude without longitude', () => {
    expect(createPlaceSyncJobSchema.safeParse({ latitude: 24.86 }).success).toBe(false);
  });

  it('rejects a radius above the 50km cap', () => {
    expect(
      createPlaceSyncJobSchema.safeParse({
        latitude: 24.86,
        longitude: 67.01,
        radiusMeters: 100_000,
      }).success,
    ).toBe(false);
  });

  it('rejects an out-of-range latitude', () => {
    expect(createPlaceSyncJobSchema.safeParse({ latitude: 200, longitude: 67.01 }).success).toBe(
      false,
    );
  });
});
