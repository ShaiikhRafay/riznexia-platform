# Deployment Strategy — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-27

> **Scope change note:** No Stripe secret/integration anywhere in the pipeline. Otherwise structurally unchanged — this document was already infrastructure-focused.

## 1. Two Distinct Deployment Surfaces

1. **The platform itself** (`apps/web`, `apps/api`) — internal dashboard, accessible only to Riznexia employees. This document's primary focus.
2. **Generated demo websites** — deployed by the platform's own deployment pipeline (Technical Architecture §4, §6) as a feature, not via this CI/CD, always under Riznexia-owned accounts.

## 2. Environments

| Environment | Purpose | Trigger |
|---|---|---|
| Local | Developer machines | `pnpm dev` via Turborepo, local Postgres or Neon dev branch |
| Preview | Per-PR isolated environment | Automatic on PR open (Vercel preview deploy for `web`; Railway/Neon branch for `api`/DB) |
| Staging | Pre-production validation | Automatic on merge to `main` |
| Production | Live internal tool for the sales team | Manual promotion via release PR/tag to `production` branch |

## 3. Platform CI/CD Pipeline (GitHub Actions)

1. **On PR:** install deps (pnpm, cached) → `turbo run lint typecheck test build` → Vercel preview deploy (`web`) + ephemeral Neon branch migration check (`api`/`db`).
2. **On merge to `main`:** full pipeline again → deploy `apps/web` to Vercel (staging alias) → deploy `apps/api` to Railway (staging service) → run Prisma migrations against staging DB → run E2E + AI regression suites.
3. **On promotion to `production`:** deploy `apps/web` to Vercel (production) → deploy `apps/api` to Railway (production service) → run Prisma migrations against production DB (manual approval gate on the migration step) → smoke test critical endpoints post-deploy.

## 4. Database Migrations

- Prisma migrations committed to `packages/db`, reviewed in the same PR as the schema change.
- Backward-compatible expand/contract pattern for breaking changes (add nullable column → deploy code using it → backfill → later PR drops old column).

## 5. Rollback Strategy

- **`apps/web` / `apps/api`:** instant rollback to the previous deployment artifact via Vercel/Railway.
- **Database:** additive-first migrations (§4) so a code rollback doesn't require a destructive DB rollback; a bad migration is fixed with a new forward migration.

## 6. Configuration & Secrets

- Environment variables/secrets managed in Vercel's and Railway's native secret stores per environment.
- Third-party API keys in scope: Anthropic, Google Places, image-gen provider, GitHub App credentials, Vercel API token, Clerk. **No payment/billing secrets exist in this system.**

## 7. Feature Flags

Lightweight, config-driven flags (typed `packages/shared-types` config object, environment-overridable) for staged rollout of new generation-pipeline stages or template categories — no dedicated feature-flag service needed at this scale.

## 8. Monitoring & Alerting

- Vercel/Railway deployment status feeds a basic alert (Slack/email) on failed production deploys.
- Trigger.dev's built-in observability covers pipeline-level failures (generation/deployment job failures), surfaced on the dashboard and to an internal ops channel.
- Cost dashboard (API Specifications §3 `/cost/summary`) alerts when nearing the internal spend ceiling (BRD BR-7).

---
**Proceeding to Document 15 (Security Strategy).**
