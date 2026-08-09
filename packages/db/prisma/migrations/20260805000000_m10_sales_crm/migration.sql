-- Module M10 — Sales CRM (DECISIONS.md D-082+)
-- Purely additive except for `sales_proposals`, which is redefined in
-- place (DECISIONS.md D-085): the table has never been used by any
-- application code since it was first scaffolded (M2-era), so there are
-- no existing rows to backfill — `version` can be added NOT NULL with no
-- default.

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- Requires Postgres 12+ (ALTER TYPE ... ADD VALUE inside a transaction
-- block was not permitted before then). VIEWED/ACCEPTED/REJECTED added
-- for proposal tracking (DECISIONS.md D-085); EDITED is kept (never
-- dropped once shipped) but is no longer produced by any M10 code path.
ALTER TYPE "ProposalStatus" ADD VALUE 'VIEWED';
ALTER TYPE "ProposalStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "ProposalStatus" ADD VALUE 'REJECTED';

-- AlterEnum
-- CALL/EMAIL/MEETING/WHATSAPP/WEBSITE_GENERATED/PREVIEW_SENT/PROPOSAL_SENT
-- added to the existing M4 activity-timeline vocabulary (DECISIONS.md
-- D-086) — reused, not duplicated into a parallel CRM activity system.
ALTER TYPE "LeadActivityType" ADD VALUE 'CALL';
ALTER TYPE "LeadActivityType" ADD VALUE 'EMAIL';
ALTER TYPE "LeadActivityType" ADD VALUE 'MEETING';
ALTER TYPE "LeadActivityType" ADD VALUE 'WHATSAPP';
ALTER TYPE "LeadActivityType" ADD VALUE 'WEBSITE_GENERATED';
ALTER TYPE "LeadActivityType" ADD VALUE 'PREVIEW_SENT';
ALTER TYPE "LeadActivityType" ADD VALUE 'PROPOSAL_SENT';

-- CreateTable
CREATE TABLE "sales_stages" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_won" BOOLEAN NOT NULL DEFAULT false,
    "is_lost" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lost_reasons" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lost_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_crms" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "deal_value_usd" DECIMAL(12,2),
    "lost_reason_id" TEXT,
    "owner_id" TEXT,
    "next_follow_up_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_crms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tasks" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_to" TEXT,
    "reminder_at" TIMESTAMP(3),
    "estimated_duration_minutes" INTEGER,
    "actual_duration_minutes" INTEGER,
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_settings" (
    "id" TEXT NOT NULL,
    "default_stage_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "business_hours" JSONB,
    "default_reminder_minutes_before_due" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable (sales_proposals — D-085: immutable version history)
ALTER TABLE "sales_proposals" DROP COLUMN "draft_content",
ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "content" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL,
ADD COLUMN     "viewed_at" TIMESTAMP(3);

-- DropIndex (superseded by the composite index below)
DROP INDEX "sales_proposals_lead_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "sales_stages_key_key" ON "sales_stages"("key");

-- CreateIndex
CREATE UNIQUE INDEX "sales_stages_order_key" ON "sales_stages"("order");

-- CreateIndex
CREATE INDEX "sales_stages_archived_at_idx" ON "sales_stages"("archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "lost_reasons_key_key" ON "lost_reasons"("key");

-- CreateIndex
CREATE UNIQUE INDEX "lost_reasons_order_key" ON "lost_reasons"("order");

-- CreateIndex
CREATE INDEX "lost_reasons_archived_at_idx" ON "lost_reasons"("archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "lead_crms_lead_id_key" ON "lead_crms"("lead_id");

-- CreateIndex
CREATE INDEX "lead_crms_stage_id_idx" ON "lead_crms"("stage_id");

-- CreateIndex
CREATE INDEX "lead_crms_owner_id_idx" ON "lead_crms"("owner_id");

-- CreateIndex
CREATE INDEX "lead_crms_next_follow_up_at_idx" ON "lead_crms"("next_follow_up_at");

-- CreateIndex
CREATE INDEX "crm_tasks_lead_id_idx" ON "crm_tasks"("lead_id");

-- CreateIndex
CREATE INDEX "crm_tasks_assigned_to_status_idx" ON "crm_tasks"("assigned_to", "status");

-- CreateIndex
CREATE INDEX "crm_tasks_due_date_idx" ON "crm_tasks"("due_date");

-- CreateIndex
CREATE INDEX "sales_proposals_lead_id_created_at_idx" ON "sales_proposals"("lead_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_proposals_lead_id_version_key" ON "sales_proposals"("lead_id", "version");

-- AddForeignKey
ALTER TABLE "lead_crms" ADD CONSTRAINT "lead_crms_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_crms" ADD CONSTRAINT "lead_crms_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "sales_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_crms" ADD CONSTRAINT "lead_crms_lost_reason_id_fkey" FOREIGN KEY ("lost_reason_id") REFERENCES "lost_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_crms" ADD CONSTRAINT "lead_crms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_settings" ADD CONSTRAINT "crm_settings_default_stage_id_fkey" FOREIGN KEY ("default_stage_id") REFERENCES "sales_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_proposals" ADD CONSTRAINT "sales_proposals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: 10 default sales stages (founder's brief, in pipeline order).
-- `key` is what application code references (LeadCrmService's
-- default-stage lookup, CrmSettings.defaultStageId seed below) — never
-- the `id`, which is only a storage-level identity.
INSERT INTO "sales_stages" ("id", "key", "name", "order", "is_won", "is_lost", "created_at", "updated_at") VALUES
    (gen_random_uuid(), 'new', 'New', 1, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'contacted', 'Contacted', 2, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'qualified', 'Qualified', 3, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'analysis_ready', 'Analysis Ready', 4, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'website_ready', 'Website Ready', 5, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'preview_sent', 'Preview Sent', 6, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'proposal_sent', 'Proposal Sent', 7, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'negotiation', 'Negotiation', 8, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'won', 'Won', 9, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'lost', 'Lost', 10, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed: 7 default lost reasons (founder's Decision 11 — configurable, not a fixed enum).
INSERT INTO "lost_reasons" ("id", "key", "label", "order", "created_at", "updated_at") VALUES
    (gen_random_uuid(), 'price_too_high', 'Price too high', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'chose_competitor', 'Chose a competitor', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'no_budget', 'No budget', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'not_interested', 'Not interested', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'unresponsive', 'Unresponsive', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'timing_not_right', 'Timing not right', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'other', 'Other', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed: the one CrmSettings singleton row (founder's Decision 12), defaulting
-- to the 'new' stage seeded above.
INSERT INTO "crm_settings" ("id", "default_stage_id", "currency", "timezone", "default_reminder_minutes_before_due", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", 'USD', 'UTC', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sales_stages" WHERE "key" = 'new';
