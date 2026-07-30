-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('ADMIN', 'MANAGER', 'SALES_REP');

-- CreateEnum
CREATE TYPE "WebsiteStatusType" AS ENUM ('NONE', 'OUTDATED', 'PRESENT');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('NEW', 'QUALIFIED', 'CONTACTED', 'IN_DISCUSSION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "WebsiteGenStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY_FOR_REVIEW', 'DEPLOYED', 'FAILED');

-- CreateEnum
CREATE TYPE "GenerationStage" AS ENUM ('ANALYSIS', 'BRAND', 'CONTENT', 'IMAGE', 'SEO', 'BUILD');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'EDITED', 'SENT_MANUALLY');

-- CreateEnum
CREATE TYPE "DiscoveryJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'SALES_REP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_jobs" (
    "id" TEXT NOT NULL,
    "created_by" TEXT,
    "city" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "DiscoveryJobStatus" NOT NULL DEFAULT 'QUEUED',
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "google_place_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "places_data" JSONB NOT NULL,
    "website_status" "WebsiteStatusType" NOT NULL DEFAULT 'NONE',
    "discovery_job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "pipeline_stage" "PipelineStage" NOT NULL DEFAULT 'NEW',
    "assigned_to" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_analyses" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "brand_brief" JSONB NOT NULL,
    "sentiment_summary" JSONB,
    "ai_model_used" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "status" "WebsiteGenStatus" NOT NULL DEFAULT 'DRAFT',
    "template_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_kits" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "palette" JSONB NOT NULL,
    "typography" JSONB NOT NULL,
    "logo_asset_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_pages" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_blocks" JSONB NOT NULL,
    "seo_meta_title" TEXT,
    "seo_meta_description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "stage" "GenerationStage" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "ai_usage_metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "github_repo_url" TEXT,
    "vercel_project_id" TEXT,
    "live_url" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "deployed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_proposals" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "draft_content" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "cost_usd" DECIMAL(10,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_members_clerk_user_id_key" ON "team_members"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_email_key" ON "team_members"("email");

-- CreateIndex
CREATE INDEX "team_members_deleted_at_idx" ON "team_members"("deleted_at");

-- CreateIndex
CREATE INDEX "discovery_jobs_created_by_idx" ON "discovery_jobs"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_google_place_id_key" ON "businesses"("google_place_id");

-- CreateIndex
CREATE INDEX "businesses_deleted_at_idx" ON "businesses"("deleted_at");

-- CreateIndex
CREATE INDEX "businesses_city_idx" ON "businesses"("city");

-- CreateIndex
CREATE INDEX "businesses_category_idx" ON "businesses"("category");

-- CreateIndex
CREATE INDEX "businesses_discovery_job_id_idx" ON "businesses"("discovery_job_id");

-- CreateIndex
CREATE INDEX "businesses_business_name_idx" ON "businesses"("business_name");

-- CreateIndex
CREATE UNIQUE INDEX "leads_business_id_key" ON "leads"("business_id");

-- CreateIndex
CREATE INDEX "leads_pipeline_stage_idx" ON "leads"("pipeline_stage");

-- CreateIndex
CREATE INDEX "leads_assigned_to_idx" ON "leads"("assigned_to");

-- CreateIndex
CREATE INDEX "leads_deleted_at_idx" ON "leads"("deleted_at");

-- CreateIndex
CREATE INDEX "business_analyses_business_id_created_at_idx" ON "business_analyses"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "websites_lead_id_idx" ON "websites"("lead_id");

-- CreateIndex
CREATE INDEX "websites_deleted_at_idx" ON "websites"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "brand_kits_website_id_key" ON "brand_kits"("website_id");

-- CreateIndex
CREATE UNIQUE INDEX "website_pages_website_id_slug_key" ON "website_pages"("website_id", "slug");

-- CreateIndex
CREATE INDEX "generation_jobs_website_id_stage_idx" ON "generation_jobs"("website_id", "stage");

-- CreateIndex
CREATE INDEX "deployments_website_id_deployed_at_idx" ON "deployments"("website_id", "deployed_at");

-- CreateIndex
CREATE INDEX "sales_proposals_lead_id_idx" ON "sales_proposals"("lead_id");

-- CreateIndex
CREATE INDEX "cost_events_created_at_idx" ON "cost_events"("created_at");

-- CreateIndex
CREATE INDEX "cost_events_event_type_created_at_idx" ON "cost_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "discovery_jobs" ADD CONSTRAINT "discovery_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_discovery_job_id_fkey" FOREIGN KEY ("discovery_job_id") REFERENCES "discovery_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_analyses" ADD CONSTRAINT "business_analyses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_pages" ADD CONSTRAINT "website_pages_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_proposals" ADD CONSTRAINT "sales_proposals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

