-- Module M6 — AI Business Analyzer (DECISIONS.md D-037+)
-- Non-destructive: every ADD COLUMN is nullable-or-defaulted, so existing
-- business_analyses rows never violate a NOT NULL constraint mid-migration.
-- The five columns that end up NOT NULL (analysis_version, ai_provider,
-- ai_model, prompt_name/version/hash, input_hash) are added nullable, then
-- backfilled, then constrained — in that order — so no row is ever dropped
-- or rejected.

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiProviderName" AS ENUM ('CLAUDE', 'OPENAI', 'GEMINI', 'DEEPSEEK', 'LOCAL_LLM');

-- AlterTable: add every new column nullable first (including the ones that
-- become NOT NULL below) — brand_brief is loosened to nullable permanently
-- (a FAILED analysis has no brief).
ALTER TABLE "business_analyses"
  ADD COLUMN     "analysis_version" INTEGER,
  ADD COLUMN     "prompt_name" TEXT,
  ADD COLUMN     "prompt_version" TEXT,
  ADD COLUMN     "prompt_hash" TEXT,
  ADD COLUMN     "ai_provider" "AiProviderName",
  ADD COLUMN     "ai_model" TEXT,
  ADD COLUMN     "input_hash" TEXT,
  ADD COLUMN     "status" "AnalysisStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN     "confidence_score" DOUBLE PRECISION,
  ADD COLUMN     "raw_response" TEXT,
  ADD COLUMN     "validation_errors" JSONB,
  ADD COLUMN     "execution_time_ms" INTEGER,
  ADD COLUMN     "completed_at" TIMESTAMP(3),
  ADD COLUMN     "prompt_tokens" INTEGER,
  ADD COLUMN     "completion_tokens" INTEGER,
  ADD COLUMN     "total_tokens" INTEGER,
  ADD COLUMN     "estimated_cost" DECIMAL(10,4),
  ALTER COLUMN "brand_brief" DROP NOT NULL;

-- Backfill existing rows (any BusinessAnalysis written before M6 — the
-- opaque-JSON era) with satisfiable placeholder values so the NOT NULL
-- constraints below don't reject them. `analysis_version` starts at 1 per
-- row (no prior row had a concept of versioning, so each existing row is
-- its own business's first and only version at migration time).
-- `prompt_hash`/`input_hash` are set to a fixed sentinel ('legacy') rather
-- than left blank, so a later cache lookup or prompt-hash assertion never
-- matches a legacy row by accident (an empty string could coincidentally
-- match a real hash's initial state in test fixtures; 'legacy' cannot).
UPDATE "business_analyses"
SET
  "analysis_version" = 1,
  "prompt_name" = 'unknown',
  "prompt_version" = 'v0',
  "prompt_hash" = 'legacy',
  "ai_provider" = 'CLAUDE',
  "ai_model" = COALESCE("ai_model_used", 'unknown'),
  "input_hash" = 'legacy',
  "completed_at" = "created_at",
  "status" = 'COMPLETED'
WHERE "analysis_version" IS NULL;

-- AlterTable: now that every existing row has a value, apply the NOT NULL
-- constraints the M6 schema requires.
ALTER TABLE "business_analyses"
  ALTER COLUMN "analysis_version" SET NOT NULL,
  ALTER COLUMN "analysis_version" SET DEFAULT 1,
  ALTER COLUMN "prompt_name" SET NOT NULL,
  ALTER COLUMN "prompt_version" SET NOT NULL,
  ALTER COLUMN "prompt_hash" SET NOT NULL,
  ALTER COLUMN "ai_provider" SET NOT NULL,
  ALTER COLUMN "ai_model" SET NOT NULL,
  ALTER COLUMN "input_hash" SET NOT NULL,
  DROP COLUMN "ai_model_used";

-- CreateIndex
CREATE UNIQUE INDEX "business_analyses_business_id_analysis_version_key" ON "business_analyses"("business_id", "analysis_version");

-- CreateIndex
CREATE INDEX "business_analyses_business_id_input_hash_status_idx" ON "business_analyses"("business_id", "input_hash", "status");
