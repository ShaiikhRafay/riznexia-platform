# Changelog

Format loosely follows [Keep a Changelog](https://keepachangelog.com/). This project isn't released/versioned yet — entries are grouped by module under `[Unreleased]` until the first real deployment.

## [Unreleased]

### M1 — Lead Discovery

- **Added:** Real `packages/cache` implementation (Upstash Redis client wrapper), replacing the M0 placeholder.
- **Added:** `places.adapter.ts` — Google Places API (New) integration using the three-tier cost-tiered fetch strategy from the approved M1 design review (search → cheap website-check → full details only for qualifying candidates).
- **Added:** `website-fetch.adapter.ts` — SSRF-guarded HTTP client for checking a candidate business's own website.
- **Added:** `website-status.classifier.ts` — heuristic website-outdated classifier (HTTPS, viewport meta, copyright year, response health); AI-assisted fallback tier deferred to Module M3/M4 (DECISIONS.md D-005).
- **Added:** `cost.service.ts` — per-request quota enforcement against the $300/month ceiling, `cost_event` logging for every Places API call.
- **Added:** `discovery` module — `POST /discovery-jobs`, `GET /discovery-jobs`, `GET /discovery-jobs/:id`; pipeline logic in `DiscoveryRunnerService`, dispatched in-process pending real Trigger.dev wiring (DECISIONS.md D-004).
- **Added:** `leads` module — `GET /leads` (filterable/paginated), `GET /leads/:id`. Mutation endpoints remain out of scope (Module M2).
- **Added:** `DiscoveryJob`/`Lead` zod schemas in `packages/shared-types`.
- **Added:** `FR-1.7` refresh semantics on rediscovery — business-data fields update, but pipeline stage/assignment/notes (Module M2's CRM state) are never touched by the discovery pipeline; a candidate that flips to `present` still refreshes an already-tracked lead's status without paying for the full-details tier.
- **Changed:** `docker-compose.yml` — added `serverless-redis-http` sidecar so local dev has an Upstash-REST-compatible endpoint (DECISIONS.md D-006).
- **Fixed:** `apps/api` was missing a `tsconfig.build.json`, so every `*.spec.ts` file was being compiled into the production `dist/` output since Module M0 — see DECISIONS.md D-009.
- **Tests:** 143 unit tests + 15 integration/e2e tests in `apps/api` (up from M0's 45 + 4); 18 unit tests in `packages/shared-types` (up from 4).
- **Docs:** `DECISIONS.md`, `TASKS.md` added at repo root.

### M0 — Platform Foundation

- **Added:** Monorepo scaffolding (Turborepo, pnpm workspaces, ESLint 9 flat config, Prettier, Husky, lint-staged, Docker, GitHub Actions CI).
- **Added:** Full Prisma schema (12 active models, 6 commented-out Post-MVP models).
- **Added:** Clerk-based auth/RBAC — global guards, role decorators, `GET /me`, signed webhook sync.
- **Fixed:** Several build-correctness bugs only visible once the compiled server was run (tsconfig `outDir`/module-format resolution, missing per-package ESLint configs, `/health` not marked public) — see `DECISIONS.md` D-001 through D-003.
