import { describe, expect, it } from 'vitest';
import {
  createSalesProposalSchema,
  salesProposalSchema,
  updateSalesProposalStatusSchema,
} from './sales-proposal';

const UUID_A = '11111111-1111-4111-8111-111111111111';

function validProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    leadId: UUID_A,
    version: 1,
    content: 'Draft pitch text.',
    status: 'draft',
    sentAt: null,
    viewedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    createdById: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('salesProposalSchema', () => {
  it('accepts a draft with no content (tracking-only)', () => {
    expect(salesProposalSchema.safeParse(validProposal({ content: null })).success).toBe(true);
  });

  it('accepts a fully-tracked accepted proposal', () => {
    expect(
      salesProposalSchema.safeParse(
        validProposal({
          status: 'accepted',
          sentAt: new Date().toISOString(),
          viewedAt: new Date().toISOString(),
          acceptedAt: new Date().toISOString(),
        }),
      ).success,
    ).toBe(true);
  });

  it('rejects version 0', () => {
    expect(salesProposalSchema.safeParse(validProposal({ version: 0 })).success).toBe(false);
  });
});

describe('createSalesProposalSchema', () => {
  it('accepts an empty body (content is optional)', () => {
    expect(createSalesProposalSchema.safeParse({}).success).toBe(true);
  });

  it('accepts real content', () => {
    expect(createSalesProposalSchema.safeParse({ content: 'Proposal text' }).success).toBe(true);
  });

  it('never accepts a client-supplied version (no such field on the schema)', () => {
    const result = createSalesProposalSchema.safeParse({ content: 'x', version: 99 });
    // version is stripped by default zod object parsing (no .strict()) —
    // confirms the field simply isn't part of the validated/returned shape.
    expect(result.success).toBe(true);
    if (result.success) expect('version' in result.data).toBe(false);
  });
});

describe('updateSalesProposalStatusSchema', () => {
  it('accepts every settable status', () => {
    for (const status of ['sent_manually', 'viewed', 'accepted', 'rejected']) {
      expect(updateSalesProposalStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects "draft" (not a settable target — every version starts there)', () => {
    expect(updateSalesProposalStatusSchema.safeParse({ status: 'draft' }).success).toBe(false);
  });

  it('rejects "edited" (never produced by any M10 code path)', () => {
    expect(updateSalesProposalStatusSchema.safeParse({ status: 'edited' }).success).toBe(false);
  });

  it('never validates a content field (immutability — no such field exists on this schema)', () => {
    const result = updateSalesProposalStatusSchema.safeParse({
      status: 'viewed',
      content: 'sneaky edit',
    });
    expect(result.success).toBe(true);
    if (result.success) expect('content' in result.data).toBe(false);
  });
});
