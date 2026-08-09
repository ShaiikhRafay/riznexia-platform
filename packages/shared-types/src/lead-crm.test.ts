import { describe, expect, it } from 'vitest';
import {
  assignLeadOwnerSchema,
  leadCrmSchema,
  transitionLeadStageSchema,
  updateLeadCrmSchema,
} from './lead-crm';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('leadCrmSchema', () => {
  it('accepts a fully-populated record', () => {
    expect(
      leadCrmSchema.safeParse({
        id: UUID_A,
        leadId: UUID_A,
        stageId: UUID_A,
        dealValueUsd: 1500,
        lostReasonId: null,
        ownerId: UUID_A,
        nextFollowUpAt: null,
        lastActivityAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it('rejects a negative deal value', () => {
    expect(
      leadCrmSchema.safeParse({
        id: UUID_A,
        leadId: UUID_A,
        stageId: UUID_A,
        dealValueUsd: -1,
        lostReasonId: null,
        ownerId: null,
        nextFollowUpAt: null,
        lastActivityAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });
});

describe('transitionLeadStageSchema', () => {
  it('accepts a stage move with no lost reason', () => {
    expect(transitionLeadStageSchema.safeParse({ stageId: UUID_A }).success).toBe(true);
  });

  it('accepts a stage move with a lost reason', () => {
    expect(
      transitionLeadStageSchema.safeParse({ stageId: UUID_A, lostReasonId: UUID_A }).success,
    ).toBe(true);
  });
});

describe('assignLeadOwnerSchema', () => {
  it('accepts an explicit unassign (null)', () => {
    expect(assignLeadOwnerSchema.safeParse({ ownerId: null }).success).toBe(true);
  });

  it('accepts a real owner id', () => {
    expect(assignLeadOwnerSchema.safeParse({ ownerId: UUID_A }).success).toBe(true);
  });

  it('rejects a missing ownerId key', () => {
    expect(assignLeadOwnerSchema.safeParse({}).success).toBe(false);
  });
});

describe('updateLeadCrmSchema', () => {
  it('rejects an empty body', () => {
    expect(updateLeadCrmSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a deal value update', () => {
    expect(updateLeadCrmSchema.safeParse({ dealValueUsd: 5000 }).success).toBe(true);
  });

  it('accepts clearing the follow-up date', () => {
    expect(updateLeadCrmSchema.safeParse({ nextFollowUpAt: null }).success).toBe(true);
  });
});
