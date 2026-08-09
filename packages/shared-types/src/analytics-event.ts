import { z } from 'zod';
import { analyticsProviderNameSchema } from './analytics-provider';

// Module M12 (DECISIONS.md D-106) — the only table this module owns
// (founder's explicit Decision 4). No create/list endpoint exists for
// this schema this phase — it's written internally by
// `SelfHostedAnalyticsProvider.track()`, not a public API surface; the
// schema exists for internal type-safety and as the shape a future admin
// view would read.
export const analyticsEventSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string().min(1),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  actorId: z.string().uuid().nullable(),
  provider: analyticsProviderNameSchema,
  metadata: z.record(z.unknown()).nullable(),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
