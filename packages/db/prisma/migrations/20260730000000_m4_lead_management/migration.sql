-- Module M4 — Lead Management APIs (DECISIONS.md D-030 through D-032).
-- Hand-authored incremental migration, same constraint and technique as
-- D-020/D-024: `prisma migrate diff --from-migrations` needs a live/shadow
-- database this environment doesn't have. Every DDL statement below is
-- copied verbatim from a `prisma migrate diff --from-empty` render of the
-- final schema (so the table/index/constraint SQL is Prisma's, not
-- hand-written); only the ordering and the data-backfill step are authored
-- here.
--
-- ORDER MATTERS: `lead_notes` must exist and be backfilled from
-- `leads.notes` BEFORE that column is dropped, or the existing note content
-- is destroyed. The drop is deliberately the last statement.

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('CREATED', 'STAGE_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'NOTE_ADDED', 'TAGS_CHANGED', 'DELETED');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "lead_notes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "type" "LeadActivityType" NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_tags_idx" ON "leads" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "lead_notes_lead_id_created_at_idx" ON "lead_notes"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "lead_activities_lead_id_created_at_idx" ON "lead_activities"("lead_id", "created_at");

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: migrate every existing single-field note into the new
-- append-only collection before the column is dropped. `author_id` is NULL
-- because the old column never recorded who wrote it — that's precisely the
-- gap this table closes, and inventing an author here would be a lie.
-- `created_at` uses the lead's own `updated_at` as the closest available
-- approximation of when the note was last written; it is not exact, and is
-- better than pretending the note was written at migration time.
INSERT INTO "lead_notes" ("id", "lead_id", "author_id", "body", "created_at")
SELECT gen_random_uuid(), "id", NULL, "notes", "updated_at"
FROM "leads"
WHERE "notes" IS NOT NULL AND btrim("notes") <> '';

-- DropColumn — destructive, and deliberately last (see header note).
ALTER TABLE "leads" DROP COLUMN "notes";
