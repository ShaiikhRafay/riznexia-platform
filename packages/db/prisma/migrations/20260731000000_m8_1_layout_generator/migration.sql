-- Module M8.1 — Layout Generator (DECISIONS.md D-050+)
-- Purely additive: one new table, no existing table altered. The M7
-- amendments (section_component_map, DECISIONS.md D-049) that this table
-- depends on live in 20260730030000_m7_theme_engine/migration.sql, not here
-- — M7's migration was still unshipped when D-049 landed, so it was folded
-- in directly rather than split across two migrations (same rationale as
-- D-048's amendment to the same file).

-- CreateTable
CREATE TABLE "layout_configurations" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "business_analysis_id" TEXT NOT NULL,
    "theme_configuration_id" TEXT NOT NULL,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "layout_engine_version" TEXT NOT NULL,
    "page_structure" JSONB NOT NULL,
    "navigation" JSONB NOT NULL,
    "hero" JSONB NOT NULL,
    "footer" JSONB NOT NULL,
    "sidebar" JSONB,
    "grid" JSONB NOT NULL,
    "responsive_rules" JSONB NOT NULL,
    "cta_placements" JSONB NOT NULL,
    "component_placeholders" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "layout_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "layout_configurations_business_id_created_at_idx" ON "layout_configurations"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "layout_configurations_theme_configuration_id_idx" ON "layout_configurations"("theme_configuration_id");

-- CreateIndex
CREATE UNIQUE INDEX "layout_configurations_business_id_config_version_key" ON "layout_configurations"("business_id", "config_version");

-- AddForeignKey
ALTER TABLE "layout_configurations" ADD CONSTRAINT "layout_configurations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_configurations" ADD CONSTRAINT "layout_configurations_business_analysis_id_fkey" FOREIGN KEY ("business_analysis_id") REFERENCES "business_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_configurations" ADD CONSTRAINT "layout_configurations_theme_configuration_id_fkey" FOREIGN KEY ("theme_configuration_id") REFERENCES "theme_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
