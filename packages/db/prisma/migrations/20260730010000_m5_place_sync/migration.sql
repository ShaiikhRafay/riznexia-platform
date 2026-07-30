-- Module M5 — Google Places Synchronization (DECISIONS.md D-033 through
-- D-036). Hand-authored incremental migration, same constraint and
-- technique as D-020/D-024/M4: no live/shadow database in this
-- environment, so `prisma migrate diff --from-schema-datamodel` was run
-- between the pre-M5 schema and the current schema (both as plain
-- datamodel files, no DB needed for that comparison) and its output is
-- reproduced verbatim below — only the file placement is hand-authored.
--
-- Purely additive: four new enums, new nullable/defaulted columns on the
-- existing `businesses` table, and a new `place_sync_jobs` table. No
-- existing column is altered or dropped, so there is no backfill step and
-- no ordering hazard like M4's `lead_notes` migration had.

-- CreateEnum
CREATE TYPE "BusinessSourceProvider" AS ENUM ('GOOGLE', 'YELP', 'FACEBOOK', 'FOURSQUARE', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "WebsiteDetectionMethod" AS ENUM ('GOOGLE_API', 'HEURISTIC_SCAN', 'AI_FALLBACK', 'MANUAL');

-- CreateEnum
CREATE TYPE "BusinessOperatingStatus" AS ENUM ('OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY');

-- CreateEnum
CREATE TYPE "PlaceSyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "business_status" "BusinessOperatingStatus" NOT NULL DEFAULT 'OPERATIONAL',
ADD COLUMN     "google_business_url" TEXT,
ADD COLUMN     "last_sync_job_id" TEXT,
ADD COLUMN     "last_synced_at" TIMESTAMP(3),
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "opening_hours" JSONB,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photos" JSONB,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "review_count" INTEGER,
ADD COLUMN     "source_provider" "BusinessSourceProvider" NOT NULL DEFAULT 'GOOGLE',
ADD COLUMN     "sync_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "website_detected_at" TIMESTAMP(3),
ADD COLUMN     "website_detection_method" "WebsiteDetectionMethod";

-- CreateTable
CREATE TABLE "place_sync_jobs" (
    "id" TEXT NOT NULL,
    "created_by" TEXT,
    "provider" "BusinessSourceProvider" NOT NULL DEFAULT 'GOOGLE',
    "city" TEXT,
    "category" TEXT,
    "keyword" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "radius_meters" INTEGER,
    "status" "PlaceSyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "success_rate" DOUBLE PRECISION,
    "api_calls_used" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "businesses_found" INTEGER NOT NULL DEFAULT 0,
    "businesses_created" INTEGER NOT NULL DEFAULT 0,
    "businesses_updated" INTEGER NOT NULL DEFAULT 0,
    "businesses_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_sync_jobs_created_by_idx" ON "place_sync_jobs"("created_by");

-- CreateIndex
CREATE INDEX "place_sync_jobs_status_idx" ON "place_sync_jobs"("status");

-- CreateIndex
CREATE INDEX "businesses_last_sync_job_id_idx" ON "businesses"("last_sync_job_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_last_sync_job_id_fkey" FOREIGN KEY ("last_sync_job_id") REFERENCES "place_sync_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_sync_jobs" ADD CONSTRAINT "place_sync_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
