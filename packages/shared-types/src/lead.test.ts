import { describe, expect, it } from 'vitest';
import { leadSchema, listLeadsQuerySchema } from './lead';

describe('leadSchema', () => {
  const valid = {
    id: '11111111-1111-4111-8111-111111111111',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    websiteStatus: 'none',
    pipelineStage: 'new',
    assignedTo: null,
    notes: null,
    createdAt: new Date().toISOString(),
  };

  it('accepts a well-formed unassigned lead', () => {
    expect(leadSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an assigned lead with notes', () => {
    const result = leadSchema.safeParse({
      ...valid,
      assignedTo: '22222222-2222-4222-8222-222222222222',
      notes: 'Called once, no answer',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a websiteStatus outside the documented enum', () => {
    expect(leadSchema.safeParse({ ...valid, websiteStatus: 'unknown' }).success).toBe(false);
  });

  it('rejects a pipelineStage outside the documented enum', () => {
    expect(leadSchema.safeParse({ ...valid, pipelineStage: 'archived' }).success).toBe(false);
  });
});

describe('listLeadsQuerySchema', () => {
  it('defaults limit to 25', () => {
    expect(listLeadsQuerySchema.parse({}).limit).toBe(25);
  });

  it('coerces a string limit from query params', () => {
    expect(listLeadsQuerySchema.parse({ limit: '10' }).limit).toBe(10);
  });

  it('rejects a limit above 100', () => {
    expect(listLeadsQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
});
