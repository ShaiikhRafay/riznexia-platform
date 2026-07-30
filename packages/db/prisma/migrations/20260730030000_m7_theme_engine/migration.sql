-- Module M7 — Theme Engine (DECISIONS.md D-044+)
-- Purely additive: 7 new enums + one new table, no existing table altered.
-- Amended (D-048, CostService integration follow-up) to add the 7 nullable
-- ai_recommendation_* columns directly into this table's original CREATE
-- TABLE rather than as a separate migration — this migration had not been
-- applied to any live database (same no-live-DB constraint as every prior
-- module), so folding the addition in keeps M7's migration a single
-- coherent artifact instead of two migrations for a module that never
-- shipped between them.
-- Amended again (D-049, M8.1 Layout Generator) to add section_component_map
-- — same not-yet-shipped rationale as D-048's amendment above.

-- CreateEnum
CREATE TYPE "NavigationStyle" AS ENUM ('TOP_BAR', 'TOP_BAR_STICKY', 'SIDEBAR', 'MINIMAL_HAMBURGER');

-- CreateEnum
CREATE TYPE "HeroStyle" AS ENUM ('FULL_BLEED_IMAGE', 'SPLIT_IMAGE_TEXT', 'VIDEO_BACKGROUND', 'CAROUSEL', 'MINIMAL_TEXT');

-- CreateEnum
CREATE TYPE "CtaStyle" AS ENUM ('SOLID_BUTTON', 'OUTLINE_BUTTON', 'FLOATING_ACTION', 'BANNER_STRIP');

-- CreateEnum
CREATE TYPE "CardStyle" AS ENUM ('ELEVATED_SHADOW', 'FLAT_BORDERED', 'MINIMAL_DIVIDER', 'IMAGE_OVERLAY');

-- CreateEnum
CREATE TYPE "FooterStyle" AS ENUM ('MULTI_COLUMN', 'SIMPLE_CENTERED', 'NEWSLETTER_CTA');

-- CreateEnum
CREATE TYPE "AnimationLevel" AS ENUM ('NONE', 'SUBTLE', 'MODERATE', 'EXPRESSIVE');

-- CreateEnum
CREATE TYPE "ImageStyle" AS ENUM ('PHOTOGRAPHY_REALISTIC', 'ILLUSTRATION', 'ICON_DRIVEN', 'MINIMAL_GRAPHIC');

-- CreateTable
CREATE TABLE "theme_configurations" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "business_analysis_id" TEXT NOT NULL,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "theme_id" TEXT NOT NULL,
    "theme_name" TEXT NOT NULL,
    "theme_version" TEXT NOT NULL,
    "theme_hash" TEXT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selected_by_engine_version" TEXT NOT NULL,
    "compatibility_score" DOUBLE PRECISION NOT NULL,
    "industry" TEXT NOT NULL,
    "layout_style" TEXT NOT NULL,
    "color_palette" JSONB NOT NULL,
    "typography" JSONB NOT NULL,
    "component_set" JSONB NOT NULL,
    "navigation_style" "NavigationStyle" NOT NULL,
    "hero_style" "HeroStyle" NOT NULL,
    "cta_style" "CtaStyle" NOT NULL,
    "card_style" "CardStyle" NOT NULL,
    "footer_style" "FooterStyle" NOT NULL,
    "animation_level" "AnimationLevel" NOT NULL,
    "image_style" "ImageStyle" NOT NULL,
    "section_order" JSONB NOT NULL,
    "accessibility_profile" JSONB NOT NULL,
    "mobile_preferences" JSONB NOT NULL,
    "section_component_map" JSONB NOT NULL,
    "ranked_themes" JSONB NOT NULL,
    "ai_recommendation_provider" "AiProviderName",
    "ai_recommendation_model" TEXT,
    "ai_recommendation_prompt_tokens" INTEGER,
    "ai_recommendation_completion_tokens" INTEGER,
    "ai_recommendation_total_tokens" INTEGER,
    "ai_recommendation_cost_usd" DECIMAL(10,4),
    "ai_recommendation_execution_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "theme_configurations_business_id_created_at_idx" ON "theme_configurations"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "theme_configurations_business_analysis_id_idx" ON "theme_configurations"("business_analysis_id");

-- CreateIndex
CREATE UNIQUE INDEX "theme_configurations_business_id_config_version_key" ON "theme_configurations"("business_id", "config_version");

-- AddForeignKey
ALTER TABLE "theme_configurations" ADD CONSTRAINT "theme_configurations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_configurations" ADD CONSTRAINT "theme_configurations_business_analysis_id_fkey" FOREIGN KEY ("business_analysis_id") REFERENCES "business_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

