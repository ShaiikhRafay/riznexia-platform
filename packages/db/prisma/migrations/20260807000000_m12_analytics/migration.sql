-- Module M12 (DECISIONS.md D-105+) — Analytics & Reporting.
-- AnalyticsEvent is the only table this module owns (founder's explicit
-- Decision 4) — every report/dashboard/aggregation computation elsewhere
-- in this module reads M1-M11's own tables directly instead.

-- CreateEnum
CREATE TYPE "AnalyticsProviderName" AS ENUM ('SELF_HOSTED', 'POSTHOG', 'GOOGLE_ANALYTICS', 'MIXPANEL', 'AZURE_APPLICATION_INSIGHTS', 'DATADOG');

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "actor_id" TEXT,
    "provider" "AnalyticsProviderName" NOT NULL DEFAULT 'SELF_HOSTED',
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_event_type_occurred_at_idx" ON "analytics_events"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_entity_type_entity_id_idx" ON "analytics_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "analytics_events_actor_id_occurred_at_idx" ON "analytics_events"("actor_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
