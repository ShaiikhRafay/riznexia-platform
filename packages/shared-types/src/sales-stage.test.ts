import { describe, expect, it } from 'vitest';
import { createSalesStageSchema, salesStageSchema, updateSalesStageSchema } from './sales-stage';

const UUID_A = '11111111-1111-4111-8111-111111111111';

function validStage(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    key: 'new',
    name: 'New',
    order: 1,
    isWon: false,
    isLost: false,
    color: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('salesStageSchema', () => {
  it('accepts a valid stage', () => {
    expect(salesStageSchema.safeParse(validStage()).success).toBe(true);
  });

  it('accepts an archived stage', () => {
    expect(
      salesStageSchema.safeParse(validStage({ archivedAt: new Date().toISOString() })).success,
    ).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    expect(salesStageSchema.safeParse(validStage({ id: 'not-a-uuid' })).success).toBe(false);
  });
});

describe('createSalesStageSchema', () => {
  it('accepts a minimal valid input, defaulting isWon/isLost to false', () => {
    const result = createSalesStageSchema.safeParse({
      key: 'demo_scheduled',
      name: 'Demo Scheduled',
      order: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isWon).toBe(false);
      expect(result.data.isLost).toBe(false);
    }
  });

  it('lowercases the key', () => {
    const result = createSalesStageSchema.safeParse({ key: 'DEMO', name: 'Demo', order: 1 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.key).toBe('demo');
  });

  it('rejects a key with spaces or symbols', () => {
    expect(
      createSalesStageSchema.safeParse({ key: 'not valid!', name: 'X', order: 1 }).success,
    ).toBe(false);
  });

  it('rejects a non-positive order', () => {
    expect(createSalesStageSchema.safeParse({ key: 'x', name: 'X', order: 0 }).success).toBe(false);
  });
});

describe('updateSalesStageSchema', () => {
  it('accepts a partial update', () => {
    expect(updateSalesStageSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
  });

  it('rejects an empty body', () => {
    expect(updateSalesStageSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an unknown key (.strict())', () => {
    expect(updateSalesStageSchema.safeParse({ key: 'nope' }).success).toBe(false);
  });
});
