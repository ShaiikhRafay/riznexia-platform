-- Module M8.2 — Component Generator (DECISIONS.md D-055+)
-- Purely additive: one new table, no existing table altered.

-- CreateTable
CREATE TABLE "component_manifests" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "business_analysis_id" TEXT NOT NULL,
    "theme_configuration_id" TEXT NOT NULL,
    "layout_configuration_id" TEXT NOT NULL,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "component_engine_version" TEXT NOT NULL,
    "theme_tokens" JSONB NOT NULL,
    "components" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "component_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "component_manifests_business_id_created_at_idx" ON "component_manifests"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "component_manifests_layout_configuration_id_idx" ON "component_manifests"("layout_configuration_id");

-- CreateIndex
CREATE UNIQUE INDEX "component_manifests_business_id_config_version_key" ON "component_manifests"("business_id", "config_version");

-- AddForeignKey
ALTER TABLE "component_manifests" ADD CONSTRAINT "component_manifests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_manifests" ADD CONSTRAINT "component_manifests_business_analysis_id_fkey" FOREIGN KEY ("business_analysis_id") REFERENCES "business_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_manifests" ADD CONSTRAINT "component_manifests_theme_configuration_id_fkey" FOREIGN KEY ("theme_configuration_id") REFERENCES "theme_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_manifests" ADD CONSTRAINT "component_manifests_layout_configuration_id_fkey" FOREIGN KEY ("layout_configuration_id") REFERENCES "layout_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
