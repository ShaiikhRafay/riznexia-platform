-- Module M8.3 — Content Binding (DECISIONS.md D-061+)
-- Purely additive: one new table, no existing table altered.

-- CreateTable
CREATE TABLE "content_manifests" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "business_analysis_id" TEXT NOT NULL,
    "theme_configuration_id" TEXT NOT NULL,
    "layout_configuration_id" TEXT NOT NULL,
    "component_manifest_id" TEXT NOT NULL,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "content_engine_version" TEXT NOT NULL,
    "component_content" JSONB NOT NULL,
    "unresolved_bindings" JSONB NOT NULL,
    "seo_metadata" JSONB NOT NULL,
    "structured_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_manifests_business_id_created_at_idx" ON "content_manifests"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "content_manifests_component_manifest_id_idx" ON "content_manifests"("component_manifest_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_manifests_business_id_config_version_key" ON "content_manifests"("business_id", "config_version");

-- AddForeignKey
ALTER TABLE "content_manifests" ADD CONSTRAINT "content_manifests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_manifests" ADD CONSTRAINT "content_manifests_business_analysis_id_fkey" FOREIGN KEY ("business_analysis_id") REFERENCES "business_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_manifests" ADD CONSTRAINT "content_manifests_theme_configuration_id_fkey" FOREIGN KEY ("theme_configuration_id") REFERENCES "theme_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_manifests" ADD CONSTRAINT "content_manifests_layout_configuration_id_fkey" FOREIGN KEY ("layout_configuration_id") REFERENCES "layout_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_manifests" ADD CONSTRAINT "content_manifests_component_manifest_id_fkey" FOREIGN KEY ("component_manifest_id") REFERENCES "component_manifests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
