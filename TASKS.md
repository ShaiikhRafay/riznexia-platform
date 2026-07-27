# Tasks

Living tracker, one entry per module from [docs/21-implementation-roadmap.md](docs/21-implementation-roadmap.md). Update this file as part of any module's implementation, not after the fact.

## M0 — Platform Foundation

- [x] Monorepo scaffolding (Turborepo/pnpm), tooling (ESLint/Prettier/Husky/lint-staged/Docker/GitHub Actions)
- [x] Prisma schema (all 12 active models + 6 commented-out Post-MVP models)
- [x] Clerk auth: `ClerkAuthGuard`, `RolesGuard`, `@Public()`/`@Roles()`/`@CurrentUser()`, `GET /me`, `POST /webhooks/clerk`
- [x] Global exception filter + typed exception hierarchy
- **Status: Complete.**

## M1 — Lead Discovery

- [x] `packages/cache`: Upstash Redis client wrapper (real implementation, replacing M0's placeholder)
- [x] Local dev Redis proxy (`serverless-redis-http`) added to `docker-compose.yml` — see DECISIONS.md D-006
- [x] `packages/shared-types`: `DiscoveryJob`/`Lead` zod schemas + types
- [x] `places.adapter.ts` — three-tier Places API (New) fetch strategy
- [x] `website-fetch.adapter.ts` — SSRF-guarded site fetch (22 dedicated tests)
- [x] `website-status.classifier.ts` — heuristic classifier, AI-fallback port deferred (DECISIONS.md D-005)
- [x] `cost.service.ts` — quota enforcement + `cost_event` logging
- [x] `discovery` module: `POST/GET /discovery-jobs`, `GET /discovery-jobs/:id`, pipeline runner
- [x] `leads` module: `GET /leads`, `GET /leads/:id` (read-only scope; mutations are Module M2)
- [x] Unit tests for every new service/adapter/classifier (143 unit tests total in `apps/api`)
- [x] Integration tests (NestJS TestingModule + Supertest) — mocked data layer, see DECISIONS.md D-008 (15 e2e tests total)
- [x] Verified: compiled server (`nest build` → `node dist/main.js`) boots, all discovery/leads routes map, auth guard protects them
- [x] Verified: `*.spec.ts` excluded from the production build output (`tsconfig.build.json` added — was silently missing since M0)
- [ ] **Not done in this environment:** real Trigger.dev wiring (D-004), live Postgres/Redis verification (D-008), a real Google Places API key smoke test — all explicitly flagged, not silently skipped
- **Status: Implementation complete, pending your approval.**

## M2 — Lead Pipeline / CRM

- [ ] Not started.

## M3 — Business Intelligence

- [ ] Not started.

## M4 — AI Generation Core

- [ ] Not started.

## M5 — Website Preview & Generator UI

- [ ] Not started.

## M6 — Deployment

- [ ] Not started.

## M7 — Sales & Outreach

- [ ] Not started.

## M8 — CRM Assistant

- [ ] Not started.

## M9 — Analytics & Cost

- [ ] Not started.

## M10 — Team & Settings

- [ ] Not started.

## M11 — Observability & Hardening

- [ ] Not started.
