-- Module M11 (DECISIONS.md D-092+) — Deployment Engine.
-- WebsiteDeployment/DeploymentHealthCheck/Domain, all FK'd to
-- GeneratedWebsite (M8) directly — never the legacy, untouched
-- Website/Deployment scaffold from M2.

-- CreateEnum
CREATE TYPE "DeploymentProviderName" AS ENUM ('VERCEL', 'CLOUDFLARE_PAGES', 'NETLIFY', 'AWS_AMPLIFY', 'AZURE_STATIC_WEB_APPS', 'SELF_HOSTED');

-- CreateEnum
CREATE TYPE "DeploymentEnvironment" AS ENUM ('PRODUCTION', 'PREVIEW');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('REQUESTED', 'VALIDATING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'UNHEALTHY');

-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('CUSTOM', 'SUBDOMAIN');

-- CreateEnum
CREATE TYPE "DomainVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "SslStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "website_deployments" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "generated_website_id" TEXT NOT NULL,
    "generated_website_version" INTEGER NOT NULL,
    "deployment_version" INTEGER NOT NULL,
    "provider" "DeploymentProviderName" NOT NULL,
    "provider_version" TEXT NOT NULL,
    "provider_deployment_id" TEXT,
    "environment" "DeploymentEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    "commit_hash" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'REQUESTED',
    "health_status" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "live_url" TEXT,
    "error_message" TEXT,
    "deployment_hash" TEXT NOT NULL,
    "deployment_engine_version" TEXT NOT NULL,
    "rollback_from_deployment_id" TEXT,
    "retry_of_deployment_id" TEXT,
    "build_started_at" TIMESTAMP(3),
    "build_completed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "execution_duration_ms" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_health_checks" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL,
    "response_time_ms" INTEGER,
    "http_status_code" INTEGER,
    "detail" JSONB,

    CONSTRAINT "deployment_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "type" "DomainType" NOT NULL,
    "provider" "DeploymentProviderName" NOT NULL,
    "verification_status" "DomainVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_record" JSONB,
    "ssl_status" "SslStatus" NOT NULL DEFAULT 'PENDING',
    "current_deployment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_deployments_business_id_created_at_idx" ON "website_deployments"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "website_deployments_generated_website_id_idx" ON "website_deployments"("generated_website_id");

-- CreateIndex
CREATE UNIQUE INDEX "website_deployments_business_id_deployment_version_key" ON "website_deployments"("business_id", "deployment_version");

-- CreateIndex
CREATE INDEX "deployment_health_checks_deployment_id_checked_at_idx" ON "deployment_health_checks"("deployment_id", "checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains"("hostname");

-- CreateIndex
CREATE INDEX "domains_business_id_idx" ON "domains"("business_id");

-- CreateIndex
CREATE INDEX "domains_current_deployment_id_idx" ON "domains"("current_deployment_id");

-- AddForeignKey
ALTER TABLE "website_deployments" ADD CONSTRAINT "website_deployments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_deployments" ADD CONSTRAINT "website_deployments_generated_website_id_fkey" FOREIGN KEY ("generated_website_id") REFERENCES "generated_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_deployments" ADD CONSTRAINT "website_deployments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_health_checks" ADD CONSTRAINT "deployment_health_checks_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "website_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_current_deployment_id_fkey" FOREIGN KEY ("current_deployment_id") REFERENCES "website_deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
