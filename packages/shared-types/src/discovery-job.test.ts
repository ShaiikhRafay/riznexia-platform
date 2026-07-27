import { describe, expect, it } from 'vitest';
import { createDiscoveryJobSchema, discoveryJobSchema } from './discovery-job';

describe('discoveryJobSchema', () => {
  it('accepts a well-formed job', () => {
    const result = discoveryJobSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      city: 'Karachi',
      category: 'restaurant',
      status: 'completed',
      resultsCount: 12,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative resultsCount', () => {
    const result = discoveryJobSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      city: 'Karachi',
      category: 'restaurant',
      status: 'completed',
      resultsCount: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a status outside the documented enum', () => {
    const result = discoveryJobSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      city: 'Karachi',
      category: 'restaurant',
      status: 'pending',
      resultsCount: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('createDiscoveryJobSchema', () => {
  it('defaults radiusKm to 15 when omitted', () => {
    const result = createDiscoveryJobSchema.parse({ city: 'Karachi', categories: ['restaurant'] });
    expect(result.radiusKm).toBe(15);
  });

  it('rejects an empty categories array', () => {
    expect(createDiscoveryJobSchema.safeParse({ city: 'Karachi', categories: [] }).success).toBe(
      false,
    );
  });

  it('rejects more than 5 categories in one request', () => {
    const categories = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(createDiscoveryJobSchema.safeParse({ city: 'Karachi', categories }).success).toBe(false);
  });

  it('rejects a radius above the 50km cap', () => {
    expect(
      createDiscoveryJobSchema.safeParse({
        city: 'Karachi',
        categories: ['restaurant'],
        radiusKm: 100,
      }).success,
    ).toBe(false);
  });
});
