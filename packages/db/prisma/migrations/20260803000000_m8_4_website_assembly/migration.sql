-- Module M8.4 — Website Assembly (DECISIONS.md D-068+)
-- Purely additive: one new table, no existing table altered.

-- CreateTable
CREATE TABLE "generated_websites" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "business_analysis_id" TEXT NOT NULL,
    "theme_configuration_id" TEXT NOT NULL,
    "layout_configuration_id" TEXT NOT NULL,
    "component_manifest_id" TEXT NOT NULL,
    "content_manifest_id" TEXT NOT NULL,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "assembly_engine_version" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_websites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_websites_business_id_created_at_idx" ON "generated_websites"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "generated_websites_content_manifest_id_idx" ON "generated_websites"("content_manifest_id");

-- CreateIndex
CREATE UNIQUE INDEX "generated_websites_business_id_config_version_key" ON "generated_websites"("business_id", "config_version");

-- AddForeignKey
ALTER TABLE "generated_websites" ADD CONSTRAINT "generated_websites_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_websites" ADD CONSTRAINT "generated_websites_business_analysis_id_fkey" FOREIGN KEY ("business_analysis_id") REFERENCES "business_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_websites" ADD CONSTRAINT "generated_websites_theme_configuration_id_fkey" FOREIGN KEY ("theme_configuration_id") REFERENCES "theme_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_websites" ADD CONSTRAINT "generated_websites_layout_configuration_id_fkey" FOREIGN KEY ("layout_configuration_id") REFERENCES "layout_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_websites" ADD CONSTRAINT "generated_websites_component_manifest_id_fkey" FOREIGN KEY ("component_manifest_id") REFERENCES "component_manifests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_websites" ADD CONSTRAINT "generated_websites_content_manifest_id_fkey" FOREIGN KEY ("content_manifest_id") REFERENCES "content_manifests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
