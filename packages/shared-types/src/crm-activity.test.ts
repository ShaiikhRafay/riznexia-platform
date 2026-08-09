import { describe, expect, it } from 'vitest';
import { logLeadActivitySchema } from './crm-activity';

describe('logLeadActivitySchema', () => {
  it('accepts a bare type with no note or occurredAt', () => {
    expect(logLeadActivitySchema.safeParse({ type: 'call' }).success).toBe(true);
  });

  it('accepts a type with a note and an occurredAt', () => {
    expect(
      logLeadActivitySchema.safeParse({
        type: 'meeting',
        note: 'Discussed pricing',
        occurredAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it('rejects an activity type outside the four loggable types (e.g. system-emitted ones)', () => {
    expect(logLeadActivitySchema.safeParse({ type: 'website_generated' }).success).toBe(false);
    expect(logLeadActivitySchema.safeParse({ type: 'note_added' }).success).toBe(false);
  });

  it('rejects an empty note string', () => {
    expect(logLeadActivitySchema.safeParse({ type: 'call', note: '' }).success).toBe(false);
  });
});
