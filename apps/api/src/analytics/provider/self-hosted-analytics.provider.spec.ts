import type { PrismaClient } from '@riznexia/db';
import { SelfHostedAnalyticsProvider } from './self-hosted-analytics.provider';

describe('SelfHostedAnalyticsProvider', () => {
  let prisma: { analyticsEvent: { create: jest.Mock } };
  let provider: SelfHostedAnalyticsProvider;

  beforeEach(() => {
    prisma = { analyticsEvent: { create: jest.fn().mockResolvedValue({}) } };
    provider = new SelfHostedAnalyticsProvider(prisma as unknown as PrismaClient);
  });

  it('exposes name "self_hosted" and is always configured', () => {
    expect(provider.name).toBe('self_hosted');
    expect(provider.isConfigured()).toBe(true);
  });

  it('writes a minimal event with only eventType provided', async () => {
    await provider.track({ eventType: 'dashboard_viewed' });
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: 'dashboard_viewed', provider: 'SELF_HOSTED' }),
    });
  });

  it('writes a fully-populated event', async () => {
    const occurredAt = new Date('2026-08-07T00:00:00.000Z');
    await provider.track({
      eventType: 'report_generated',
      entityType: 'AnalyticsReport',
      entityId: 'ai_cost',
      actorId: 'actor-1',
      metadata: { period: 'monthly' },
      occurredAt,
    });
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'report_generated',
        entityType: 'AnalyticsReport',
        entityId: 'ai_cost',
        actorId: 'actor-1',
        provider: 'SELF_HOSTED',
        metadata: { period: 'monthly' },
        occurredAt,
      },
    });
  });

  it('defaults occurredAt to now when omitted', async () => {
    const before = Date.now();
    await provider.track({ eventType: 'x' });
    const [args] = prisma.analyticsEvent.create.mock.calls[0] as [{ data: { occurredAt: Date } }];
    expect(args.data.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
