import { describe, expect, it } from 'vitest';
import { createLostReasonSchema, lostReasonSchema, updateLostReasonSchema } from './lost-reason';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('lostReasonSchema', () => {
  it('accepts a valid lost reason', () => {
    expect(
      lostReasonSchema.safeParse({
        id: UUID_A,
        key: 'price_too_high',
        label: 'Price too high',
        order: 1,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
});

describe('createLostReasonSchema', () => {
  it('accepts a valid input', () => {
    expect(
      createLostReasonSchema.safeParse({ key: 'went_dark', label: 'Went dark', order: 8 }).success,
    ).toBe(true);
  });

  it('rejects an invalid key', () => {
    expect(
      createLostReasonSchema.safeParse({ key: 'Went Dark!', label: 'x', order: 1 }).success,
    ).toBe(false);
  });
});

describe('updateLostReasonSchema', () => {
  it('rejects an empty body', () => {
    expect(updateLostReasonSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a label rename', () => {
    expect(updateLostReasonSchema.safeParse({ label: 'Renamed' }).success).toBe(true);
  });
});
