# Implementation Roadmap — Riznexia AI Sales Platform

**Status:** Official — this is the authoritative module order and roadmap going forward.
**Last updated:** 2026-07-29 — M3's task list refreshed to match what was actually delivered (see doc-sync note, DECISIONS.md D-029)

> **Scope note:** 12 buildable modules (M1–M12), each with GitHub milestones/issues and a sprint plan. Project Setup (below) is prerequisite tooling/infra work that predates the numbered sequence, not a module itself.
>
> **"Independently deployable" clarification:** Doc 16 §3 establishes a **modular monolith** — one NestJS process, one Next.js app — not separate microservices per module. "Independently deployable" here means each module ships as a **complete, working vertical slice that can merge to `main` and go to production on its own**, without waiting for other unfinished modules to be ready (Doc 11's trunk-based, continuous-deploy model already supports this). It does not mean each module runs as its own hosted service.
>
> **Renumbering note (2026-07-28):** This roadmap was restructured by the founder from an earlier 12-module plan (M0–M11). The mapping from old to new numbering, and the reasoning behind each split/merge, is recorded in `DECISIONS.md` D-022 — read that first if a cross-reference elsewhere in the repo still cites an old module number. Two modules from the old plan (**Team & Settings**, **Observability & Hardening**) aren't in the new numbered list; they're carried forward in the **Backlog** section at the end of this document rather than silently dropped, pending the founder's call on where they land.

---

## 0. Status at a glance

| Module | Name                          | Status                                                                                                         |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| —      | Project Setup                 | ✅ Complete                                                                                                    |
| M1     | Lead Discovery                | ✅ Complete                                                                                                    |
| M2     | Database & Core Domain Models | ✅ Complete (pending founder approval)                                                                         |
| M3     | Authentication & RBAC         | ✅ Complete                                                                                                    |
| M4     | Lead Management APIs          | ✅ Backend complete (pending founder approval); UI portion of the original DoD not built, see docs/21 M4 entry |
| M5     | Google Places Synchronization | ⬜ Not started                                                                                                 |
| M6     | AI Business Analyzer          | ⬜ Not started                                                                                                 |
| M7     | Theme Engine                  | ⬜ Not started                                                                                                 |
| M8     | Website Generator             | ⬜ Not started                                                                                                 |
| M9     | Website Preview               | ⬜ Not started                                                                                                 |
| M10    | Sales CRM                     | ⬜ Not started                                                                                                 |
| M11    | Deployment                    | ⬜ Not started                                                                                                 |
| M12    | Analytics & Reporting         | ⬜ Not started                                                                                                 |

## 1. Module Breakdown

### Project Setup (pre-module, completed)

| Field              | Detail                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Stand up the monorepo, CI/CD, and infra so every numbered module has something to build on. No longer a numbered module in this roadmap (see renumbering note above) — the auth/RBAC portion of what this used to include is now **M3**.                                                                                            |
| Dependencies       | None — first work done                                                                                                                                                                                                                                                                                                              |
| Tasks              | Initialize Turborepo/pnpm monorepo (Doc 05); provision Neon, Railway, Vercel, Upstash Redis, Cloudflare R2, GitHub org, Trigger.dev; Prisma schema scaffold (superseded by M2's real schema); CI pipeline (lint/typecheck/test/build gates); global exception filter + typed exception hierarchy; `packages/logger` + Sentry wiring |
| Status             | Complete                                                                                                                                                                                                                                                                                                                            |
| Testing Strategy   | CI pipeline validated by intentionally breaking a check once                                                                                                                                                                                                                                                                        |
| Definition of Done | A developer can clone and run `pnpm dev` against a working monorepo with CI gates enforced                                                                                                                                                                                                                                          |

### M1 — Lead Discovery

| Field              | Detail                                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Let a rep run a discovery search and get back real, qualified leads                                                                                                                                 |
| Dependencies       | Project Setup                                                                                                                                                                                       |
| Tasks              | Places API adapter + Lead Finder Agent (Doc 20 §4); Website Checker Agent incl. AI-fallback tier (Doc 20 §5); `discovery-jobs`/`leads` endpoints (Doc 19); Redis-backed result caching (Doc 16 §10) |
| Status             | Complete                                                                                                                                                                                            |
| Priority           | P0                                                                                                                                                                                                  |
| Risks              | Google Places data quality/coverage varies by region (BRD risk) — test against 2–3 real target cities early, not synthetic data                                                                     |
| Testing Strategy   | Unit tests on the outdated-website heuristic against real+synthetic site fixtures; integration test for dedupe-by-place-id                                                                          |
| Definition of Done | PRD FR-1.1–FR-1.6 pass; a rep runs a real search against a live city and sees qualified leads appear                                                                                                |

### M2 — Database & Core Domain Models

| Field              | Detail                                                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Establish the production-ready core domain schema — the `Business`/`Lead` split, structurally-enforced soft delete, migrations, seed data, and the repository-equivalent service layer — as the foundation every subsequent module builds on                                                            |
| Dependencies       | Project Setup, M1 (Lead's final shape follows from what M1 actually needed)                                                                                                                                                                                                                             |
| Tasks              | `Business` entity split out of `Lead` (DECISIONS.md D-018); soft-delete Prisma Client Extension (D-019); initial migration generated without a live DB (D-020); seed data; `BusinessService`/`BusinessModule`; `LeadsService`/`DiscoveryRunnerService` reworked onto the new FK; full test suite update |
| Status             | Complete, pending founder approval                                                                                                                                                                                                                                                                      |
| Priority           | P0                                                                                                                                                                                                                                                                                                      |
| Risks              | Requested entity list conflicted with the already-approved M0/M1 schema — resolved via `AskUserQuestion` before any code was written (D-017), not guessed at                                                                                                                                            |
| Testing Strategy   | 155 unit + 20 e2e tests in `apps/api`, 26 unit tests in `packages/db` (the new soft-delete extension); full monorepo typecheck/lint/build; compiled server boot verified                                                                                                                                |
| Definition of Done | Schema validates, migration generates cleanly, every consuming service (Leads, Discovery) compiles and passes against the new model — met                                                                                                                                                               |

### M3 — Authentication & RBAC

| Field              | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Domain-restricted Clerk login, plus a full authorization layer (RBAC, hierarchy, permissions, audit logging) gating every protected endpoint                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Dependencies       | Project Setup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Tasks              | Clerk integration + domain-restricted login; global `ClerkAuthGuard`; `@Public()`/`@CurrentUser()` decorators; `GET /me`; `POST /webhooks/clerk` (signed webhook sync) — all from initial project setup. Added in this module's own implementation pass: six-role taxonomy replacing the original three (DECISIONS.md D-024); role hierarchy + `@MinRole()`/`MinRoleGuard` (D-025); fine-grained permission matrix + `@RequirePermissions()`/`PermissionsGuard` (D-026), applied to the existing Leads/Discovery endpoints; commented-out `Organization` future model (D-027); `AuditLogService` + `@Audited()`/`AuditLogInterceptor` — the first real write path for the `AuditLog` table (D-028) |
| Status             | Complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Priority           | P0 — blocks every protected endpoint in every other module                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Risks              | The brief's initial draft asked for a self-rolled JWT/refresh-token/password system, which would have replaced Clerk and reversed a documented architecture decision — resolved via `AskUserQuestion` before any code was written, not guessed at (D-023)                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Testing Strategy   | Guard/service integration tests — 100% branch coverage on the auth/role guards (Doc 13 §3); dedicated `rbac.e2e-spec.ts` proves the full `ClerkAuthGuard → RolesGuard → MinRoleGuard → PermissionsGuard → AuditLogInterceptor` chain end-to-end (55 new unit tests, 22 new integration tests)                                                                                                                                                                                                                                                                                                                                                                                                      |
| Definition of Done | A developer signs in via Clerk, hits a protected `/me` endpoint, and sees correct role-based access — met. A request lacking the required role, hierarchy level, or permission is rejected with `403 FORBIDDEN`; a successful `@Audited()` action is recorded — met                                                                                                                                                                                                                                                                                                                                                                                                                                |

### M4 — Lead Management APIs

| Field              | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Give reps and managers a working day-to-day pipeline on top of M2's data model                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Dependencies       | M2, M3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Tasks              | `POST/PATCH/DELETE /leads` (create/update/soft-delete, delete backed by M2's extension); assign/status/tags workflow; append-only notes (`LeadNote`) and rep-facing activity timeline (`LeadActivity`, distinct from `audit_log`); sort/filter/search/pagination; audit-logging on every write (Module M3's `@Audited()`, Doc 18 §6) — DECISIONS.md D-030 through D-032. Pipeline list/kanban UI and the global `/search` endpoint+UI from the original task list were **not** built in this pass — backend API only, per explicit instruction |
| Status             | Backend complete, pending founder approval; UI portion of this row's original scope remains not started                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Priority           | P0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Risks              | Architecture review surfaced 4 schema-shape conflicts against the frozen M2 model before implementation started (standalone lead creation, single-field notes, no tag support, activity/audit-log overlap) — resolved via `AskUserQuestion`, not guessed at (D-030–D-032). Kanban drag-and-drop UX can balloon scope once the UI is built — timebox: functional list+filter view first, kanban as a stretch goal                                                                                                                               |
| Testing Strategy   | 60 new unit tests, 29 new integration tests (`apps/api/test/leads.e2e-spec.ts`) covering CRUD, workflow, the full RBAC permission matrix, validation, and audit-on-write                                                                                                                                                                                                                                                                                                                                                                       |
| Definition of Done | PRD FR-2.1–FR-2.4's backend half passes (API, not UI); a caller with `leads:write` creates/updates/reassigns a lead and sees it reflected in the activity timeline and audit log — met. The UI-facing half of the original DoD ("a manager sees the whole team's pipeline") is not met yet — no frontend exists                                                                                                                                                                                                                                |

### M5 — Google Places Synchronization

| Field              | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Objective          | A production-ready, provider-abstracted synchronization engine — search (city/coordinates/radius/category/keyword), import/update/dedupe businesses, and a trackable background job with retry/progress/cost reporting. Widened from this row's original (staleness-refresh-only) scope per the actual M5 brief; discovery/analysis/generation/CRM/frontend explicitly excluded                                                                                                                                                                                                                                                                                                                                                                              |
| Dependencies       | M2 (`Business` model), M1 (Places adapter, now shared via the provider abstraction), M3 (reuses `discovery:run`/`discovery:read`, no new permissions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Tasks              | `LocationProvider` interface + `GooglePlacesProvider` (provider-agnostic, M1's `DiscoveryRunnerService` refactored onto it too — D-033); `PlacesAdapter.searchNearby` + widened field mask; caller-owned pagination (`collectSearchPages`, shared by M1 and M5 — D-034); `Business` extended with typed coordinates/phone/rating/reviewCount/openingHours/photos/businessStatus plus googleBusinessUrl/websiteDetectedAt/websiteDetectionMethod/syncVersion/sourceProvider/lastSyncedAt/lastSyncJobId (D-035); new `PlaceSyncJob` model + `PlaceSyncRunnerService` (retries, batch/bounded-concurrency processing, mid-run progress persistence, `COMPLETED`/`PARTIAL`/`FAILED` resolution — D-036); `POST/GET /place-sync-jobs`, `GET /place-sync-jobs/:id` |
| Status             | Implementation complete, pending founder approval                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Priority           | P1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Risks              | Three schema/architecture conflicts surfaced during the required pre-implementation architecture review — Business schema shape, whether the provider-abstraction rule applies retroactively to M1, exact provider naming — all resolved via `AskUserQuestion`/direct confirmation before code was written, not guessed at (D-033–D-036). A coordinate-only sync has no dedicated locality field from Google's search tier; `Business.city` falls back to the full formatted address in that case (flagged, not silently accepted as correct)                                                                                                                                                                                                                |
| Testing Strategy   | 60 new/updated unit tests (provider, pagination/retry utilities, sync runner, service, controller — the runner's retry/PARTIAL-status logic specifically covered) and 11 new integration tests (`apps/api/test/place-sync.e2e-spec.ts` — auth, validation fork, RBAC, quota, job-status reads); `discovery.e2e-spec.ts`/`discovery-runner.service.spec.ts` updated for the new `LocationProvider`/one-page-per-call contracts                                                                                                                                                                                                                                                                                                                                |
| Definition of Done | `POST /place-sync-jobs` accepts either a city+category/keyword search or a coordinate+radius search, runs in the background, and `GET /place-sync-jobs/:id` reflects real progress (businesses found/created/updated/failed, API calls used, estimated cost) through to a `COMPLETED`/`PARTIAL`/`FAILED` outcome — met                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### M6 — AI Business Analyzer

| Field              | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Objective          | Turn a qualified lead's raw business data into a 19-field structured brand brief for M7/M8, via a provider-abstracted `AiService` gateway with prompt versioning, an AI result cache, a validation/repair/escalation retry ladder, and full cost/token tracking                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Dependencies       | M2 (`Business` model), M4 (leads), M5 (`syncVersion` as the cache-invalidation signal)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tasks              | `AiTextProvider` interface + `AI_TEXT_PROVIDER` DI token, `AnthropicProvider` the sole implementation (D-037); `PromptRegistry` + versioned `business_analysis` template (name/version/hash recorded per analysis); `ResponseValidator` (Zod, never throws); `AiService` gateway — initial attempt → same-model repair retry → escalation-model repair retry → `FAILED`, each attempt transient-retried with exponential backoff (D-040); `BusinessAnalysis` schema widened to typed metadata/lifecycle columns, `brandBrief` stays `Json` (D-038); AI result cache via business-fingerprint hash vs. `syncVersion` (D-039); `GET/POST /leads/:id/business`, new `business:analyze` permission (D-043) |
| Status             | Implementation complete, pending founder approval                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Priority           | P0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Risks              | Hallucinated business facts (Doc 09 §7) — mitigated by structured `<business_data>` input delimiting (also a prompt-injection guard) + fact-grounding system-prompt constraints. Ten mandatory architecture requirements were specified and resolved into the design before code was written, not guessed at (D-037–D-043)                                                                                                                                                                                                                                                                                                                                                                             |
| Testing Strategy   | 24 new `apps/api` unit tests + 19 new `packages/ai` tests (incl. the full 3-attempt escalation ladder under fake timers) + 11 new `packages/shared-types` schema tests; 11 new integration tests (`apps/api/test/business-analysis.e2e-spec.ts` — auth, RBAC, cache hit/miss, validation)                                                                                                                                                                                                                                                                                                                                                                                                              |
| Definition of Done | `POST /leads/:id/business` triggers an AI analysis (or returns a cached one, 200 vs 202) and `GET /leads/:id/business` reflects a `PENDING`/`COMPLETED`/`FAILED` analysis with the full 19-field brief, confidence score, prompt/model provenance, and token/cost accounting — met. AI regression eval harness against golden business fixtures (Doc 13 §2) not built — no live AI credentials/fixtures available in this environment, same class of gap as M5's "not run against a live Postgres"                                                                                                                                                                                                     |

### M7 — Theme Engine

| Field              | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Select and configure a business-appropriate visual theme via a pluggable `ThemeProvider` abstraction, rule-based selection validated by (not dictated by) a lightweight AI recommendation, full compatibility ranking across every registered theme, and a versioned, reproducible `ThemeConfiguration` output — a standalone step ahead of content generation                                                                                                                                                                                                                                                                                 |
| Dependencies       | M6 (`BusinessAnalysis.brandBrief` — colorPalette/typography/layoutStyle/industry flow through verbatim, D-045)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tasks              | `ThemeProvider` interface + `THEME_PROVIDER` DI token (new `packages/themes`), `StaticThemeRegistry` + 8 versioned theme definitions (Restaurant/Salon/Dental/Law Firm/Gym/Real Estate/Medical/Corporate — D-044); deterministic 5-check compatibility scorer + full ranking (D-047); `AiService.recommendThemeCategory()` (reuses M6's gateway, D-046); `GET/POST /leads/:id/theme`, new `theme:select` permission; **follow-up:** `ThemeSelectionService` integrated with M6's `CostService` — reserve-before-call, actual usage/cost/provider/model/duration tracking, monthly ceiling respected, no cost-tracking logic duplicated (D-048) |
| Status             | Implementation complete, pending founder approval                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Priority           | P0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Risks              | Shares the `AiService` gateway risk profile already covered under M6 (mitigated further here: the AI step never throws and is fully optional to a correct result — D-046). Compatibility-score weighting is a real design judgment call (industry weighted highest at 40%) — flagged, not hidden; revisit if founder feedback on real selections suggests re-weighting                                                                                                                                                                                                                                                                         |
| Testing Strategy   | 24 new `apps/api` unit tests (incl. `THEME_NOT_FOUND` and AI-failure resilience paths), 11 new `packages/ai` tests, 17 new `packages/themes` tests (registry + scorer), 11 new `packages/shared-types` schema tests; 12 new integration tests (`apps/api/test/theme.e2e-spec.ts`) running the full flow against the real, unmocked theme registry and compatibility scorer                                                                                                                                                                                                                                                                     |
| Definition of Done | `POST /leads/:id/theme` returns a validated `ThemeConfiguration` — brand fields carried through from M6 unchanged, structural fields from the highest-ranked compatible theme, the complete ranked-theme list stored, theme version/hash and engine version recorded for reproducibility — or `THEME_NOT_FOUND` when nothing clears the compatibility bar. Met.                                                                                                                                                                                                                                                                                |

### M8 — Website Generator

| Field              | Detail                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Generate a complete, business-specific demo website's content, SEO, and imagery from a theme and brand brief                                                                                                                                                  |
| Dependencies       | M6, M7                                                                                                                                                                                                                                                        |
| Tasks              | Content Writer Agent, per-page (Doc 20 §8); SEO Agent (Doc 20 §9); Image Optimizer Agent incl. alt-text (Doc 20 §10); Website Generator Agent — deterministic assembly (Doc 20 §11); category templates in `apps/site-template`, starting with 1–2 categories |
| Status             | Not started                                                                                                                                                                                                                                                   |
| Priority           | P0                                                                                                                                                                                                                                                            |
| Risks              | Runaway AI cost from indiscriminate generation (mitigated by the Qualified-stage gate + cost ceilings, already designed); template scope creep — ship 1–2 categories fully before adding more                                                                 |
| Testing Strategy   | AI regression eval harness per agent; snapshot tests for the Website Generator Agent's deterministic assembly                                                                                                                                                 |
| Definition of Done | PRD FR-4.1–FR-4.8 pass; a full demo (all pages, brand kit, images) generates end-to-end within the <5 min target                                                                                                                                              |

### M9 — Website Preview

| Field              | Detail                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Let a rep watch generation happen and review the result before deploying                                                                                                   |
| Dependencies       | M8                                                                                                                                                                         |
| Tasks              | Pipeline stepper UI (Doc 17 §13); live preview iframe pane; regenerate-by-instruction control (the only content-adjustment path, Doc 12 §3); generation job status polling |
| Status             | Not started                                                                                                                                                                |
| Priority           | P0                                                                                                                                                                         |
| Risks              | Accidental-editor-creep (Doc 12 §3) — reviewed explicitly in PR review for this module                                                                                     |
| Testing Strategy   | E2E test (Playwright) covering generate → preview → regenerate-section                                                                                                     |
| Definition of Done | PRD FR-4.7, FR-5.1–FR-5.2 pass; a rep watches a real generation run stage-by-stage and regenerates one section without touching code                                       |

### M10 — Sales CRM

| Field              | Detail                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Objective          | Give reps AI-drafted pitch content tied to the live demo, and reduce time-to-context when picking up or reviewing a lead — merges the old "Sales & Outreach" and "CRM Assistant" modules                                                                           |
| Dependencies       | M6 (brand brief), M4 (pipeline/notes data to summarize), M9 (live URL — though the Sales Agent can draft pre-deploy too)                                                                                                                                           |
| Tasks              | Sales Agent (Doc 20 §13); Proposal Generator (Doc 20 §14); Proposals UI; CRM Assistant agent (Doc 20 §15); on-demand summarize endpoint + UI trigger; daily stale-lead sweep (scheduled Trigger.dev task); per-rep daily quota specific to the CRM Assistant agent |
| Status             | Not started                                                                                                                                                                                                                                                        |
| Priority           | P1 — high-value, not blocking the core discover→demo→deploy spine                                                                                                                                                                                                  |
| Risks              | Draft quality perceived as generic — mitigated by grounding in the same `brand_brief` used for site content. Overuse of the CRM Assistant without a cap inflating AI cost — mitigated by the per-rep quota being built in from the start                           |
| Testing Strategy   | Explicit "no auto-send path exists" test (Doc 13 §4) — a trust-boundary test, not just a feature test; unit test for the stale-lead sweep query; cost-quota enforcement integration test                                                                           |
| Definition of Done | PRD FR-8.1–FR-8.2 pass; a rep gets a usable, business-specific draft; a rep gets a lead summary grounded in real persisted data; the sweep correctly flags a fixture lead with 14+ days of no activity                                                             |

### M11 — Deployment

| Field              | Detail                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective          | Get a reviewed demo live at a real URL                                                                                                                                                                                    |
| Dependencies       | M9                                                                                                                                                                                                                        |
| Tasks              | GitHub adapter (repo create/update); Vercel adapter (project create/update, deploy trigger); Deployment Agent (Doc 20 §12); `/websites/{id}/deployments` endpoints + webhook ingestion; deployment status UI (Doc 17 §12) |
| Status             | Not started                                                                                                                                                                                                               |
| Priority           | P0                                                                                                                                                                                                                        |
| Risks              | Vercel/GitHub rate limits or account governance issues at higher demo volume — mitigated by the naming/tagging convention (Doc 04 §6) from day one                                                                        |
| Testing Strategy   | Scheduled staging smoke test against the real GitHub+Vercel integration (Doc 13 §4); idempotency tests on repeated deploy calls                                                                                           |
| Definition of Done | PRD FR-6.1–FR-6.5 pass; a real demo deploys and is reachable at a live public URL from a real staging run                                                                                                                 |

### M12 — Analytics & Reporting

| Field              | Detail                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Objective          | Give managers/admins visibility into whether the tool is working and what it costs                                                                                       |
| Dependencies       | M1, M4, M8, M11 (needs real data flowing end-to-end)                                                                                                                     |
| Tasks              | `/analytics/overview`, `/analytics/pipeline`, `/analytics/reps`, `/analytics/cost` endpoints; Analytics screen UI (Doc 17 §14); cost-ceiling alerting at 80% utilization |
| Status             | Not started                                                                                                                                                              |
| Priority           | P1                                                                                                                                                                       |
| Risks              | Metrics feel hollow without enough real usage volume yet — expected at MVP, not a defect; flag as an interpretation caveat at launch                                     |
| Testing Strategy   | Integration tests on rollup query correctness against seeded fixture data                                                                                                |
| Definition of Done | BRD §6 success criteria are all visibly measurable on this screen using real or realistic seeded data                                                                    |

**Total effort across the 12 numbered modules: ~16 engineer-weeks** (Project Setup and Backlog items below are not counted in this figure — they're not part of the numbered sequence).

## 2. GitHub Milestones

| #   | Milestone                            | Maps to       | Target     |
| --- | ------------------------------------ | ------------- | ---------- |
| —   | `Project Setup`                      | Project Setup | Sprint 1   |
| 1   | `M1 - Lead Discovery`                | M1            | Sprint 2   |
| 2   | `M2 - Database & Core Domain Models` | M2            | Sprint 2–3 |
| 3   | `M3 - Authentication & RBAC`         | M3            | Sprint 1   |
| 4   | `M4 - Lead Management APIs`          | M4            | Sprint 3   |
| 5   | `M5 - Google Places Synchronization` | M5            | Sprint 3–4 |
| 6   | `M6 - AI Business Analyzer`          | M6            | Sprint 3–4 |
| 7   | `M7 - Theme Engine`                  | M7            | Sprint 4   |
| 8   | `M8 - Website Generator`             | M8            | Sprint 4–5 |
| 9   | `M9 - Website Preview`               | M9            | Sprint 5   |
| 10  | `M10 - Sales CRM`                    | M10           | Sprint 5–6 |
| 11  | `M11 - Deployment`                   | M11           | Sprint 5   |
| 12  | `M12 - Analytics & Reporting`        | M12           | Sprint 6   |

## 3. GitHub Issues (representative, per module)

Labels use three axes: `type:*` (feature/infra/bug/test), `area:*` (backend/frontend/ai/infra), `priority:*` (P0/P1/P2). Every issue's detailed acceptance criteria trace back to the PRD FR-ID or Doc section cited in §1 — not re-stated per issue to avoid duplication.

**Project Setup**

| Issue                                                                 | Labels                                  |
| --------------------------------------------------------------------- | --------------------------------------- |
| Initialize Turborepo/pnpm monorepo skeleton                           | `type:infra` `area:infra` `priority:P0` |
| Provision Neon, Railway, Vercel, Upstash, R2, GitHub org, Trigger.dev | `type:infra` `area:infra` `priority:P0` |
| CI pipeline: lint/typecheck/test/build gates                          | `type:infra` `area:infra` `priority:P0` |
| `packages/logger` + Sentry wiring                                     | `type:infra` `area:infra` `priority:P1` |

**M1**

| Issue                                     | Labels                                       |
| ----------------------------------------- | -------------------------------------------- |
| Google Places API adapter                 | `type:feature` `area:backend` `priority:P0`  |
| Lead Finder Agent (Trigger.dev task)      | `type:feature` `area:backend` `priority:P0`  |
| Website Checker Agent — heuristic tier    | `type:feature` `area:backend` `priority:P0`  |
| Website Checker Agent — AI-fallback tier  | `type:feature` `area:ai` `priority:P1`       |
| `discovery-jobs` + `leads` list endpoints | `type:feature` `area:backend` `priority:P0`  |
| Discovery screen UI                       | `type:feature` `area:frontend` `priority:P0` |
| Redis discovery-result caching            | `type:feature` `area:backend` `priority:P1`  |

**M2**

| Issue                                                               | Labels                                      |
| ------------------------------------------------------------------- | ------------------------------------------- |
| `Business` entity split out of `Lead`                               | `type:feature` `area:backend` `priority:P0` |
| Soft-delete Prisma Client Extension                                 | `type:feature` `area:backend` `priority:P0` |
| Initial migration + seed data                                       | `type:infra` `area:backend` `priority:P0`   |
| `BusinessService`/`BusinessModule`                                  | `type:feature` `area:backend` `priority:P0` |
| Rework `LeadsService`/`DiscoveryRunnerService` onto the Business FK | `type:feature` `area:backend` `priority:P0` |

**M3**

| Issue                                            | Labels                                      |
| ------------------------------------------------ | ------------------------------------------- |
| Clerk integration + domain-restricted login      | `type:feature` `area:backend` `priority:P0` |
| Global auth guard + role guard + RBAC decorators | `type:feature` `area:backend` `priority:P0` |
| `GET /me` + `POST /webhooks/clerk`               | `type:feature` `area:backend` `priority:P0` |

**M4**

| Issue                           | Labels                                       |
| ------------------------------- | -------------------------------------------- |
| Lead CRUD + PATCH endpoints     | `type:feature` `area:backend` `priority:P0`  |
| Pipeline list/filter UI         | `type:feature` `area:frontend` `priority:P0` |
| Kanban view                     | `type:feature` `area:frontend` `priority:P1` |
| Global search endpoint + UI     | `type:feature` `area:backend` `priority:P1`  |
| Audit-log hooks on stage change | `type:feature` `area:backend` `priority:P0`  |

**M5**

| Issue                            | Labels                                      |
| -------------------------------- | ------------------------------------------- |
| Scheduled Trigger.dev sync task  | `type:feature` `area:backend` `priority:P1` |
| Stale-`Business` selection query | `type:feature` `area:backend` `priority:P1` |
| Sync-job cost budget carve-out   | `type:feature` `area:backend` `priority:P1` |

**M6**

| Issue                                                                              | Labels                                       |
| ---------------------------------------------------------------------------------- | -------------------------------------------- |
| `AiService` gateway scaffolding (provider adapters, prompt registry, cost tracker) | `type:infra` `area:ai` `priority:P0`         |
| Business Analyzer Agent                                                            | `type:feature` `area:ai` `priority:P0`       |
| `/leads/{id}/business` endpoint                                                    | `type:feature` `area:backend` `priority:P0`  |
| Business Details UI tab                                                            | `type:feature` `area:frontend` `priority:P0` |
| Output validation + guardrails                                                     | `type:feature` `area:ai` `priority:P0`       |

**M7**

| Issue                       | Labels                                 |
| --------------------------- | -------------------------------------- |
| Theme Selector Agent        | `type:feature` `area:ai` `priority:P0` |
| Theme-token output contract | `type:feature` `area:ai` `priority:P0` |

**M8**

| Issue                                            | Labels                                       |
| ------------------------------------------------ | -------------------------------------------- |
| Content Writer Agent (per-page)                  | `type:feature` `area:ai` `priority:P0`       |
| SEO Agent                                        | `type:feature` `area:ai` `priority:P0`       |
| Image Optimizer Agent + alt-text                 | `type:feature` `area:ai` `priority:P0`       |
| Website Generator Agent (deterministic assembly) | `type:feature` `area:backend` `priority:P0`  |
| Category template: restaurant                    | `type:feature` `area:frontend` `priority:P0` |
| Category template: salon/clinic                  | `type:feature` `area:frontend` `priority:P1` |

**M9**

| Issue                             | Labels                                       |
| --------------------------------- | -------------------------------------------- |
| Pipeline stepper component        | `type:feature` `area:frontend` `priority:P0` |
| Live preview iframe pane          | `type:feature` `area:frontend` `priority:P0` |
| Regenerate-by-instruction control | `type:feature` `area:frontend` `priority:P0` |
| Generation job status polling     | `type:feature` `area:frontend` `priority:P0` |

**M10**

| Issue                            | Labels                                       |
| -------------------------------- | -------------------------------------------- |
| Sales Agent                      | `type:feature` `area:ai` `priority:P1`       |
| Proposal Generator               | `type:feature` `area:ai` `priority:P1`       |
| Proposals UI                     | `type:feature` `area:frontend` `priority:P1` |
| No-auto-send trust-boundary test | `type:test` `area:backend` `priority:P0`     |
| CRM Assistant agent              | `type:feature` `area:ai` `priority:P2`       |
| Summarize endpoint + UI trigger  | `type:feature` `area:frontend` `priority:P2` |
| Daily stale-lead sweep task      | `type:feature` `area:backend` `priority:P2`  |
| Per-rep quota for CRM Assistant  | `type:feature` `area:backend` `priority:P1`  |

**M11**

| Issue                                                  | Labels                                       |
| ------------------------------------------------------ | -------------------------------------------- |
| GitHub adapter (repo create/update)                    | `type:feature` `area:backend` `priority:P0`  |
| Vercel adapter (project create/update, deploy trigger) | `type:feature` `area:backend` `priority:P0`  |
| Deployment Agent                                       | `type:feature` `area:backend` `priority:P0`  |
| `/websites/{id}/deployments` endpoints                 | `type:feature` `area:backend` `priority:P0`  |
| Vercel webhook ingestion                               | `type:feature` `area:backend` `priority:P0`  |
| Deployment status UI                                   | `type:feature` `area:frontend` `priority:P0` |

**M12**

| Issue                                              | Labels                                       |
| -------------------------------------------------- | -------------------------------------------- |
| `/analytics/overview` endpoint                     | `type:feature` `area:backend` `priority:P1`  |
| `/analytics/pipeline`, `/analytics/reps` endpoints | `type:feature` `area:backend` `priority:P1`  |
| `/analytics/cost` endpoint                         | `type:feature` `area:backend` `priority:P1`  |
| Analytics screen UI                                | `type:feature` `area:frontend` `priority:P1` |
| Cost-ceiling alerting (80% threshold)              | `type:feature` `area:infra` `priority:P0`    |

## 4. Sprint Planning

> Assumes a **3-engineer team** (this roadmap's estimates scale down with 4–5, up with 2) and **2-week sprints**, using the Track A (Backend/Platform) / Track B (AI) / Track C (Frontend) split from Doc 10. This table is a first-pass remap onto the new module boundaries — re-verify with the founder before committing real sprint dates, since splitting the old "AI Generation Core" into M7/M8 and merging M7/M8-old into M10 changes per-track load in ways the original estimates didn't account for.

| Sprint | Weeks | Track A (Backend/Platform)                    | Track B (AI)                                    | Track C (Frontend)                     |
| ------ | ----- | --------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| 1      | 1–2   | Project Setup + M3 (all hands)                | Project Setup (all hands)                       | Project Setup (all hands)              |
| 2      | 3–4   | M1 Lead Discovery                             | M6 AI gateway groundwork (shared w/ M7)         | UI scaffolding (design system, Doc 17) |
| 3      | 5–6   | M2 Database & Core Domain Models + M4 (start) | M6 AI Business Analyzer                         | M9 Generation Review screen (start)    |
| 4      | 7–8   | M4 completion + M11 Deployment (start)        | M7 Theme Engine + M8 Website Generator (agents) | M9 completion + M1/M4 UI polish        |
| 5      | 9–10  | M11 completion + M12 backend                  | M10 Sales CRM (Sales Agent half)                | M12 Analytics UI                       |
| 6      | 11–12 | M5 Google Places Synchronization              | M10 Sales CRM (CRM Assistant half)              | Cross-module polish                    |
| 7      | 13–14 | Hardening pass (all hands) — see Backlog      | Hardening pass (all hands)                      | Hardening pass (all hands)             |
| 8      | 15–16 | Buffer / bug-fix sprint                       | Buffer / bug-fix sprint                         | Internal rollout support               |

**~16 weeks (4 months) to internal launch** at 3 engineers, per this plan.

## 5. Backlog — not currently in the numbered roadmap

These two modules existed in the previous 12-module plan but aren't in the founder's new official M1–M12 list. They're carried forward here rather than silently dropped; confirm whether each should be folded into an existing module, added back as its own numbered module, or genuinely deprioritized.

### Team & Settings (previously M10)

Let Admins manage the team without engineering involvement. Tasks: `/team` endpoints (invite, role change); `/settings/profile` endpoint (theme persistence, Doc 17 §16); Team & Settings UI. Estimated 0.75 engineer-week. Natural adjacent module: **M3** (shares the RBAC/role domain) or **M4** (shares the "internal ops UI" character).

### Observability & Hardening (previously M11)

Confirm the system is safe, monitored, and ready for real internal use before rollout. Tasks: full role-authorization test pass; cross-module cost-governance load test; Sentry/Trigger.dev/uptime alerting verified end-to-end (Doc 16 §13); security review against Doc 15's OWASP posture table; internal launch checklist sign-off. Estimated 1.5 engineer-weeks. This was originally a non-negotiable gate scheduled _after_ every other module — if it's not one of the 12, it needs an explicit home (e.g. a gate after **M12**, not a module with its own slot) so it doesn't quietly fall off the plan before internal launch.

---

**Roadmap restructured per founder direction. This is the official module order going forward — see DECISIONS.md D-022 for the full old→new mapping.**
