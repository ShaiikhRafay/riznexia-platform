import { describe, expect, it } from 'vitest';
import { analyticsEventSchema } from './analytics-event';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('analyticsEventSchema', () => {
  it('accepts a self-hosted event with no actor/entity', () => {
    expect(
      analyticsEventSchema.safeParse({
        id: UUID_A,
        eventType: 'dashboard_viewed',
        entityType: null,
        entityId: null,
        actorId: null,
        provider: 'self_hosted',
        metadata: null,
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it('accepts an event with entity/actor/metadata populated', () => {
    expect(
      analyticsEventSchema.safeParse({
        id: UUID_A,
        eventType: 'report_generated',
        entityType: 'AnalyticsReport',
        entityId: 'ai_cost',
        actorId: UUID_A,
        provider: 'self_hosted',
        metadata: { period: 'monthly' },
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown provider', () => {
    expect(
      analyticsEventSchema.safeParse({
        id: UUID_A,
        eventType: 'x',
        entityType: null,
        entityId: null,
        actorId: null,
        provider: 'amplitude',
        metadata: null,
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });
});
