-- AlterTable
ALTER TABLE "business_analyses" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "custom_sites" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "files" JSONB NOT NULL,
    "file_count" INTEGER NOT NULL,
    "total_bytes" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_site_deployments" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "custom_site_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider_deployment_id" TEXT,
    "live_url" TEXT,
    "error_message" TEXT,
    "engine_version" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "custom_site_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_sites_business_id_created_at_idx" ON "custom_sites"("business_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "custom_sites_business_id_version_key" ON "custom_sites"("business_id", "version");

-- CreateIndex
CREATE INDEX "custom_site_deployments_business_id_created_at_idx" ON "custom_site_deployments"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "custom_site_deployments_custom_site_id_idx" ON "custom_site_deployments"("custom_site_id");

-- AddForeignKey
ALTER TABLE "custom_sites" ADD CONSTRAINT "custom_sites_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_site_deployments" ADD CONSTRAINT "custom_site_deployments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_site_deployments" ADD CONSTRAINT "custom_site_deployments_custom_site_id_fkey" FOREIGN KEY ("custom_site_id") REFERENCES "custom_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
