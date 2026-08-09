import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import type { AnalyticsProvider, AnalyticsTrackInput } from './analytics-provider.interface';

export const SELF_HOSTED_ANALYTICS_PROVIDER_VERSION = 'v1.0';

// Module M12 (DECISIONS.md D-105) — founder's explicit Decision 3: fully
// implemented (unlike the five reserved vendor providers, it needs no
// external credentials — "self-hosted" means the storage is our own
// `AnalyticsEvent` table, D-106). Always configured.
@Injectable()
export class SelfHostedAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'self_hosted' as const;
  readonly version = SELF_HOSTED_ANALYTICS_PROVIDER_VERSION;

  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  isConfigured(): boolean {
    return true;
  }

  async track(input: AnalyticsTrackInput): Promise<void> {
    await this.prisma.analyticsEvent.create({
      data: {
        eventType: input.eventType,
        entityType: input.entityType ?? undefined,
        entityId: input.entityId ?? undefined,
        actorId: input.actorId ?? undefined,
        provider: 'SELF_HOSTED',
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
  }
}
