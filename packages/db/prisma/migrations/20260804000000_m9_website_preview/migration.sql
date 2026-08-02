-- Module M9 — Website Preview (DECISIONS.md D-075+)
-- Purely additive: three new tables, no existing table altered.

-- CreateTable
CREATE TABLE "website_previews" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "generated_website_id" TEXT NOT NULL,
    "preview_version" INTEGER NOT NULL DEFAULT 1,
    "generated_website_version" INTEGER NOT NULL,
    "validation_version" TEXT NOT NULL,
    "generated_by_module_version" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "theme_name" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "device_presets" JSONB NOT NULL,
    "files" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_previews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preview_reports" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "generated_website_id" TEXT NOT NULL,
    "preview_version" INTEGER NOT NULL DEFAULT 1,
    "generated_website_version" INTEGER NOT NULL,
    "validation_version" TEXT NOT NULL,
    "generated_by_module_version" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "validation_timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preview_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_readiness_reports" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "generated_website_id" TEXT NOT NULL,
    "preview_version" INTEGER NOT NULL DEFAULT 1,
    "generated_website_version" INTEGER NOT NULL,
    "validation_version" TEXT NOT NULL,
    "generated_by_module_version" TEXT NOT NULL,
    "seo_score" JSONB NOT NULL,
    "accessibility_score" JSONB NOT NULL,
    "performance_score" JSONB NOT NULL,
    "content_completeness_score" JSONB NOT NULL,
    "structural_integrity_score" JSONB NOT NULL,
    "overall_publish_score" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_readiness_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_previews_business_id_created_at_idx" ON "website_previews"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "website_previews_generated_website_id_idx" ON "website_previews"("generated_website_id");

-- CreateIndex
CREATE UNIQUE INDEX "website_previews_business_id_preview_version_key" ON "website_previews"("business_id", "preview_version");

-- CreateIndex
CREATE INDEX "preview_reports_business_id_created_at_idx" ON "preview_reports"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "preview_reports_generated_website_id_idx" ON "preview_reports"("generated_website_id");

-- CreateIndex
CREATE UNIQUE INDEX "preview_reports_business_id_preview_version_key" ON "preview_reports"("business_id", "preview_version");

-- CreateIndex
CREATE INDEX "publish_readiness_reports_business_id_created_at_idx" ON "publish_readiness_reports"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "publish_readiness_reports_generated_website_id_idx" ON "publish_readiness_reports"("generated_website_id");

-- CreateIndex
CREATE UNIQUE INDEX "publish_readiness_reports_business_id_preview_version_key" ON "publish_readiness_reports"("business_id", "preview_version");

-- AddForeignKey
ALTER TABLE "website_previews" ADD CONSTRAINT "website_previews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_previews" ADD CONSTRAINT "website_previews_generated_website_id_fkey" FOREIGN KEY ("generated_website_id") REFERENCES "generated_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preview_reports" ADD CONSTRAINT "preview_reports_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preview_reports" ADD CONSTRAINT "preview_reports_generated_website_id_fkey" FOREIGN KEY ("generated_website_id") REFERENCES "generated_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_readiness_reports" ADD CONSTRAINT "publish_readiness_reports_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_readiness_reports" ADD CONSTRAINT "publish_readiness_reports_generated_website_id_fkey" FOREIGN KEY ("generated_website_id") REFERENCES "generated_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
