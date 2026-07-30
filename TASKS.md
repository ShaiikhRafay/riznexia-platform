# Tasks

Living tracker, one entry per module from [docs/21-implementation-roadmap.md](docs/21-implementation-roadmap.md). Update this file as part of any module's implementation, not after the fact.

> **Renumbering note (2026-07-28):** This file follows the new official module order (M1–M12). See DECISIONS.md D-022 for the full old→new mapping if a status entry below looks like it moved.

## Project Setup (pre-module)

- [x] Monorepo scaffolding (Turborepo/pnpm), tooling (ESLint/Prettier/Husky/lint-staged/Docker/GitHub Actions)
- [x] Prisma schema scaffold (superseded by M2's real schema)
- [x] Global exception filter + typed exception hierarchy
- **Status: Complete.**

## M1 — Lead Discovery

- [x] `packages/cache`: Upstash Redis client wrapper (real implementation, replacing the Project Setup placeholder)
- [x] Local dev Redis proxy (`serverless-redis-http`) added to `docker-compose.yml` — see DECISIONS.md D-006
- [x] `packages/shared-types`: `DiscoveryJob`/`Lead` zod schemas + types
- [x] `places.adapter.ts` — three-tier Places API (New) fetch strategy
- [x] `website-fetch.adapter.ts` — SSRF-guarded site fetch (22 dedicated tests)
- [x] `website-status.classifier.ts` — heuristic classifier, AI-fallback port deferred (DECISIONS.md D-005)
- [x] `cost.service.ts` — quota enforcement + `cost_event` logging
- [x] `discovery` module: `POST/GET /discovery-jobs`, `GET /discovery-jobs/:id`, pipeline runner
- [x] `leads` module: `GET /leads`, `GET /leads/:id` (read-only scope; mutations are Module M4)
- [x] Unit tests for every new service/adapter/classifier (143 unit tests total in `apps/api`)
- [x] Integration tests (NestJS TestingModule + Supertest) — mocked data layer, see DECISIONS.md D-008 (15 e2e tests total)
- [x] Verified: compiled server (`nest build` → `node dist/main.js`) boots, all discovery/leads routes map, auth guard protects them
- [x] Verified: `*.spec.ts` excluded from the production build output (`tsconfig.build.json` added — was silently missing since initial project setup)
- [x] **Full engineering audit performed and closed** (architecture, SOLID, performance, security, error handling, logging, validation, scalability, test coverage) — 8 real issues found and fixed, see DECISIONS.md D-010 through D-016:
  - Cost-quota check-then-act race → atomic `CostService.charge()` (reserve-first)
  - Non-transactional multi-category job creation → `prisma.$transaction([...])`
  - Job could strand in `QUEUED` forever on a DB-update failure → RUNNING update moved inside the try/catch
  - No general rate limiting → `@nestjs/throttler`, global 100/min + 10/min on `POST /discovery-jobs`
  - Whitespace-only `city`/`categories` passed validation → `.trim()` added
  - Unbounded 1-character `q` search → `.min(2)` added
  - No index on `businessName`/`city`/`category` → added (trigram/GIN follow-up documented, deferred — needs a live DB to verify)
  - `:id` params not validated as UUIDs → `ParseUUIDPipe` added to both `GET /leads/:id` and `GET /discovery-jobs/:id`
  - 20 new/updated tests added for the fixes above (unit + 2 new e2e suites); 146 unit + 20 e2e = 166 tests total, all passing
- [ ] **Not done in this environment:** real Trigger.dev wiring (D-004), live Postgres/Redis verification (D-008), a real Google Places API key smoke test — all explicitly flagged, not silently skipped
- **Status: Implementation + audit complete, pending your approval.**

## M2 — Database & Core Domain Models

Now the permanent, official identity of "M2" (DECISIONS.md D-022) — resolved from an earlier discrepancy against Doc 21's original "Lead Pipeline / CRM" scoping. That original mutation-endpoint scope now lives at **M4 — Lead Management APIs**, unbuilt.

- [x] Reconciled the brief's requested entity list (`Business, BusinessCategory, Lead, LeadStatus, Project, Website, User, Role, AuditLog`) onto the existing, already-approved schema via `AskUserQuestion` — `TeamMember`/`TeamRole` = User/Role, `Website` = Project, enums stay enums, current NestJS-idiomatic services = "the repository layer" (no new Repository interface/impl split) — DECISIONS.md D-017
- [x] `Business` split out of `Lead` — new model owns all business-data fields; `Lead` slims to pure pipeline state + unique `businessId` FK; `BusinessAnalysis`/`DiscoveryJob` retargeted accordingly; `Website`/`SalesProposal` untouched — DECISIONS.md D-018
- [x] Soft-delete Prisma Client Extension (`packages/db/src/soft-delete.extension.ts`) — structural `deletedAt: null` scoping + delete→update rerouting for `TeamMember`/`Business`/`Lead`/`Website`, replacing M1's manual per-query filtering — DECISIONS.md D-019, 26 unit tests
- [x] Initial migration generated without a live DB (`prisma migrate diff --from-empty`) — `packages/db/prisma/migrations/20260728000000_init/` — DECISIONS.md D-020
- [x] `packages/db/prisma/seed.ts` extended with `Business`/`Lead` fixtures (one per `WebsiteStatusType`, only `none`/`outdated` get a `Lead`)
- [x] New `apps/api/src/business/` module — `BusinessService` (`findByPlaceId`, `findById`, `upsertByPlaceId`), `BusinessModule`, `business.mapper.ts` (website-status mapping, moved off `lead.mapper.ts`)
- [x] `LeadsService` reworked — `findMany`/`findById` join `Business` via Prisma `include`, `upsertByPlaceId`/`existsByPlaceId` replaced with `ensureForBusiness` (create-if-none-exists, idempotent on `businessId`)
- [x] `DiscoveryRunnerService` reworked — calls `BusinessService.upsertByPlaceId` then `LeadsService.ensureForBusiness`; "already discovered" gate for a `present` result now checks Business existence, proven equivalent to the old Lead-existence check (DECISIONS.md D-018)
- [x] `lead-response.dto.ts` composes the (unchanged) flat API response from the `Lead & { business: Business }` join
- [x] `packages/db` gained its own vitest suite (matching `packages/cache`/`packages/shared-types` convention) — DECISIONS.md D-021
- [x] All affected tests updated/added: `leads.service.spec.ts` rewritten, new `business.service.spec.ts`, `discovery-runner.service.spec.ts` rewritten for the Business-first flow, `discovery.e2e-spec.ts`/`rate-limit.e2e-spec.ts` fixtures updated to the joined shape
- [x] Full validation: `packages/db`/`apps/api` (and every other touched package) typecheck, lint, unit tests, e2e tests, and `apps/api` build all pass; compiled server boots and maps every route including the new `BusinessModule` wiring
- [ ] **Not done in this environment:** running the generated migration against a real Postgres (D-020), `prisma migrate diff --from-migrations` drift check (needs a shadow DB) — both explicitly flagged, not silently skipped
- **Status: Implementation complete, pending your approval.**

## M3 — Authentication & RBAC

Authentication (Clerk integration, domain-restricted login, `ClerkAuthGuard`, `GET /me`, `POST /webhooks/clerk`) was retroactively assembled from the original "Platform Foundation" work (DECISIONS.md D-022) and already complete. This round adds the authorization layer the founder's M3 brief actually asked for — RBAC, permission middleware, role hierarchy, organization future-readiness, and audit logging — after resolving a real architecture conflict (the brief's original ask was a self-rolled JWT/password/refresh-token system, which would have replaced Clerk; the founder confirmed Clerk stays and M3 is authorization-only, DECISIONS.md D-023).

- [x] Six-role taxonomy — `TeamRole` enum replaced (`SUPER_ADMIN, ADMIN, SALES_MANAGER, DEVELOPER, SALES_EXECUTIVE, VIEWER`), hand-authored incremental migration (`packages/db/prisma/migrations/20260729000000_m3_rbac_role_taxonomy/`), `packages/shared-types`/mapper/seed data updated — DECISIONS.md D-024
- [x] Role hierarchy — `apps/api/src/common/rbac/role-hierarchy.constants.ts`, `@MinRole()`/`MinRoleGuard` for "at least this seniority" checks — DECISIONS.md D-025
- [x] Permission middleware — `apps/api/src/common/rbac/permission.constants.ts` (8 permissions, explicit per-role matrix grounded in Doc 15's existing AuthZ statement), `@RequirePermissions()`/`PermissionsGuard` — DECISIONS.md D-026
- [x] Applied to existing routes: `LeadsController` (`leads:read`), `DiscoveryController` (`discovery:run`/`discovery:read`) — additive only, no existing role loses access it had
- [x] Organization support (future-ready) — commented-out `Organization` model + `TeamMember` doc-comment, following the project's existing future-model convention — DECISIONS.md D-027
- [x] Audit logging — `AuditLogService` (real write path for the previously-unused `AuditLog` table), `@Audited()`/`AuditLogInterceptor` (global, opt-in), best-effort (a log failure never fails the action) — DECISIONS.md D-028
- [x] `RbacModule`/`AuditModule` registered globally in `app.module.ts`, guard chain: `ClerkAuthGuard → RolesGuard → MinRoleGuard → PermissionsGuard`, interceptor: `AuditLogInterceptor`
- [x] Unit tests: `role-hierarchy.constants.spec.ts`, `permission.constants.spec.ts`, `min-role.guard.spec.ts`, `permissions.guard.spec.ts`, `audit-log.service.spec.ts`, `audit-log.interceptor.spec.ts` (55 new tests) + every existing role-referencing spec updated for the 6-role taxonomy
- [x] Integration test: `apps/api/test/rbac.e2e-spec.ts` — dedicated throwaway controller (not real API surface) proving the full guard+interceptor chain over real HTTP requests, 22 tests
- [x] Full validation: 198 unit + 42 e2e tests in `apps/api`, full monorepo typecheck/lint/build all pass, compiled server boots with `RbacModule`/`AuditModule` wired and every route still mapping
- [ ] **Not done in this environment:** running the role-taxonomy migration against a real Postgres — same D-020/D-024 constraint, explicitly flagged
- **Status: Implementation complete, pending your approval.**

## M4 — Lead Management APIs

Builds on Module M2's `Business`/`Lead` split and Module M3's RBAC — the mutation-endpoint scope originally described as "Lead Pipeline / CRM" (see M2's note above). Architecture review before implementation surfaced four schema-shape conflicts against the frozen M2 model (standalone lead creation, notes-as-a-single-field, no tag support, activity vs. audit-log overlap); resolved via `AskUserQuestion` before writing code, not guessed at — DECISIONS.md D-030 through D-032.

- [x] Schema: `Lead.tags` (`String[]`, GIN index), `LeadNote` (append-only, authored), `LeadActivity` + `LeadActivityType` enum (rep-facing timeline, distinct from `audit_log`) — DECISIONS.md D-030, D-031, D-032
- [x] Hand-authored migration (`packages/db/prisma/migrations/20260730000000_m4_lead_management/`) — backfills existing `leads.notes` content into `lead_notes` before dropping the column, same no-live-DB constraint as D-020/D-024
- [x] `packages/shared-types`: `createLeadSchema`, `updateLeadSchema` (strict, empty-body-rejecting, `null`-vs-omitted-aware), `createLeadNoteSchema`, `leadNoteSchema`, `leadActivitySchema`, `LEAD_SORT_FIELDS`, tag validation (lowercased, length- and count-capped) — 41 unit tests
- [x] Typed exceptions: `LeadNotFoundException`, `BusinessNotFoundException`, `DuplicateLeadException`, `TeamMemberNotFoundException`, `InvalidSortFieldException`
- [x] `LeadActivityService` (transaction-aware recorder + paginated reader) and `LeadNotesService` (append-only notes, author-attributed) — both structurally logged
- [x] `LeadsService`: `create` (business-must-exist, one-lead-per-business, optional assignee validated), `update` (PATCH semantics, per-field activity diffing, multi-field PATCH produces multiple timeline entries), `softDelete` (reroutes through the Module M2 soft-delete extension), sort/filter/tag-filter on `findMany` — `ensureForBusiness` (discovery's write path) unchanged in contract
- [x] `LeadsController`: `POST/PATCH/DELETE /leads(/:id)`, `POST/GET /leads/:id/notes`, `GET /leads/:id/activity` — per-route `@RequirePermissions()` (`leads:read`/`leads:write`/`leads:delete`), `@Audited()` on every write route
- [x] Structured logging (`Logger`, matching the existing `DiscoveryRunnerService` convention) on every mutation in `LeadsService`/`LeadNotesService`
- [x] Unit tests: 60 new/updated tests across `leads.service.spec.ts`, `leads.controller.spec.ts`, `lead-activity.service.spec.ts`, `lead-activity.mapper.spec.ts`, `lead-notes.service.spec.ts` (241 total in `apps/api`, up from 198)
- [x] Integration tests: `apps/api/test/leads.e2e-spec.ts` — 29 tests covering CRUD, workflow, the RBAC permission matrix, validation, and audit-on-write (71 e2e total, up from 42)
- [x] Full validation: monorepo typecheck/lint/build clean, compiled server boots with all 8 `/leads*` routes mapped
- [ ] **Not done in this environment:** running the migration (incl. the notes backfill) against a real Postgres — same D-020/D-024/D-029 constraint, explicitly flagged
- [ ] **Deliberately out of scope, per instruction:** pipeline list/kanban UI and the global `/search` endpoint+UI that Doc 21's original M4 entry also listed — this pass is the backend API only; M4 isn't fully "done" against that original DoD until a UI exists, flagged rather than silently narrowed
- **Status: Implementation complete, pending your approval.**

## M5 — Google Places Synchronization

Architecture review before implementation found the requested feature set didn't fit the frozen M1/M2 schema/design without either a schema change or an interpretation call in three places (Business schema shape, the M1 refactor's scope, and the provider-abstraction naming). Resolved via `AskUserQuestion`/direct confirmation with the founder before writing code — DECISIONS.md D-033 through D-036.

- [x] `LocationProvider` interface (`apps/api/src/common/providers/`) — `search()`/`getWebsiteUri()`/`getDetails()`, one page per `search()` call; `GooglePlacesProvider` the sole implementation, registered behind the `LOCATION_PROVIDER` DI token via `ProvidersModule`
- [x] `DiscoveryRunnerService` (Module M1) refactored to depend on `LOCATION_PROVIDER`, never the concrete `PlacesAdapter` — applying the "business logic must never directly depend on Google Places APIs" rule everywhere, per the founder's explicit confirmation, not just to new M5 code
- [x] `PlacesAdapter` extended: `searchNearby()` (coordinate/radius search), widened `FULL_DETAILS_FIELD_MASK` (phone, coordinates, opening hours, business status, Google Maps URL); no longer loops pages internally — `collectSearchPages()` (`common/utils/paginate-search.ts`) is the shared caller-owned page-loop used by both M1 and M5
- [x] Schema: `Business` extended with coordinates/phone/rating/reviewCount/openingHours/photos/businessStatus (promoted from the opaque `placesData` blob to typed columns) plus `googleBusinessUrl`, `websiteDetectedAt`, `websiteDetectionMethod`, `syncVersion`, `sourceProvider`, `lastSyncedAt`, `lastSyncJobId`; new `PlaceSyncJob` model (own model, not a reuse of M1's `DiscoveryJob`) with `startedAt`/`finishedAt`/`duration`/`successRate`/`apiCallsUsed`/`estimatedCost` plus per-run progress counters — DECISIONS.md D-033, D-034
- [x] Hand-authored migration (`packages/db/prisma/migrations/20260730010000_m5_place_sync/`) — purely additive (new enums, new nullable/defaulted columns, new table), no backfill needed, same no-live-DB constraint and `prisma migrate diff --from-schema-datamodel` technique as D-020/D-024/M4
- [x] `packages/shared-types`: `createPlaceSyncJobSchema` (city+category/keyword, or latitude+longitude — mirrors the `LocationProvider.search()` fork), `placeSyncJobSchema`, `PLACE_SYNC_JOB_STATUSES` (incl. `partial`), `LOCATION_SOURCE_PROVIDERS` (every named future provider, not just Google) — 13 unit tests
- [x] `BusinessService.upsertByPlaceId` extended: all M5 fields optional (M1 keeps working unchanged), `syncVersion` starts at 1 on create and atomically increments on update, `lastSyncedAt`/`websiteDetectedAt` stamped on every call
- [x] `PlaceSyncRunnerService` — the sync engine: retries (2 attempts, linear backoff) around every individual provider call; batch/bounded-concurrency candidate processing (shared `processWithConcurrency`, same as M1); progress persisted to the job row mid-run, not only at completion; job status resolves to `COMPLETED`/`PARTIAL`/`FAILED` based on per-candidate outcomes, not just search success
- [x] `PlaceSyncService`/`PlaceSyncController` — `POST/GET /place-sync-jobs`, `GET /place-sync-jobs/:id`; reuses Module M3's `discovery:run`/`discovery:read` permissions (no new permission strings), same cost-ceiling pre-flight check and `@Throttle` as `POST /discovery-jobs`
- [x] Unit tests: 60 new/updated tests (`google-places.provider.spec.ts`, `paginate-search.spec.ts`, `retry.spec.ts`, `place-sync-runner.service.spec.ts`, `place-sync.service.spec.ts`, `place-sync.controller.spec.ts`, `places.adapter.spec.ts` rewritten for the one-page-per-call contract, `discovery-runner.service.spec.ts` rewritten for the `LocationProvider` interface, `business.service.spec.ts` extended) — 282 total in `apps/api` (up from 245)
- [x] Integration tests: `apps/api/test/place-sync.e2e-spec.ts` — 11 tests covering auth, validation (city-vs-coordinates fork), RBAC, quota, and job-status reads; `discovery.e2e-spec.ts` updated for the new `PlacesAdapter` contract (82 e2e total, up from 71)
- [x] Full validation: monorepo typecheck/lint clean, full test suite green
- [ ] **Not done in this environment:** running the migration against a real Postgres — same D-020/D-024/D-029 constraint, explicitly flagged
- [ ] **Known limitation, flagged:** a coordinate-only sync (no `city` in the request) has no dedicated locality field from Google's search field mask — `Business.city` falls back to the full formatted address in that case
- [ ] **Deliberately out of scope, per instruction:** AI Business Analysis, Theme Selection, Website Generation, CRM UI, frontend — only Google Places synchronization was built
- **Status: Implementation complete, pending your approval.**

## M6 — AI Business Analyzer

Before any code was written, the founder required a complete AI architecture design (provider abstraction, prompt versioning, response validation, caching, retry/escalation, cost tracking) presented and approved. Two rounds of explicit requirements followed the initial plan (10 mandatory architecture requirements, then final schema/permission/cache-rule decisions) — DECISIONS.md D-037 through D-043.

- [x] `AiTextProvider` interface (`packages/ai/src/provider/`) — `complete()`, provider-agnostic; `AnthropicProvider` (`@anthropic-ai/sdk`) the sole implementation, registered behind the `AI_TEXT_PROVIDER` DI token via a new `AiModule` (`apps/api/src/common/ai/`) — mirrors M5's `LocationProvider`/`LOCATION_PROVIDER` pattern exactly
- [x] `packages/ai` gained a real build step (`tsc`, CommonJS) — was source-only through M0–M5, now consumable by future M7/M8 without an apps/api dependency
- [x] `PromptRegistry` + versioned prompt template (`packages/ai/src/prompt/business-analysis/v1.0.ts`) — `PROMPT_NAME`/`PROMPT_VERSION`/`PROMPT_HASH` (SHA-256 of the fixed instructional text, computed at module load so it can never drift from what actually ran); delimited `<business_data>` input block (prompt-injection guard against text embedded in reviews/business names)
- [x] `ResponseValidator` — Zod-based (`businessAnalysisOutputSchema` + `confidenceScore`, `packages/shared-types`), strips a stray markdown fence, never throws, returns a discriminated `{ok:true,data} | {ok:false,errors}` result
- [x] `AiService` gateway — the full retry/escalation ladder in one call: initial attempt → 1x same-model repair-prompt retry → 1x escalation to a stronger model (also with a repair prompt) → `FAILED`; each attempt wrapped in `withExponentialBackoff` (2 retries, 1s/2s) for transient failures, kept strictly separate from the validation-repair ladder; emits structured events (`retry_attempt`/`repair_prompt_sent`/`validation_failure`/`provider_error`) for the caller to log
- [x] Schema: `BusinessAnalysis` expanded from two opaque `Json` fields to typed columns — `analysisVersion` (unique per business, never overwritten), `promptName`/`promptVersion`/`promptHash`, `aiProvider`/`aiModel`, `inputHash` (the AI result cache key), `status` (`AnalysisStatus`: `PENDING`/`COMPLETED`/`FAILED`), `confidenceScore`, `rawResponse`/`validationErrors` (populated only on `FAILED`), `executionTimeMs`/`completedAt`, `promptTokens`/`completionTokens`/`totalTokens`/`estimatedCost`; `brandBrief` stays a single `Json` column (not promoted to typed columns — the whole 19-field value is read together, unlike Business's Places fields); two new enums (`AnalysisStatus`, `AiProviderName`) — DECISIONS.md D-038
- [x] Hand-authored, non-destructive migration (`packages/db/prisma/migrations/20260730020000_m6_ai_business_analyzer/`) — every new NOT NULL column added nullable first, backfilled with satisfiable sentinel values for any pre-M6 row, then constrained; `ai_model_used` dropped only after the backfill
- [x] AI result cache — `computeBusinessFingerprint()` (`apps/api/src/business-analysis/business-fingerprint.ts`), a SHA-256 of the founder's named fingerprint fields (name/category/rating/reviewCount/reviews via raw Places payload/website/phone/address/photos/`Business.syncVersion`); `BusinessAnalysisService.triggerAnalysis()` compares it against the latest `COMPLETED` analysis's `inputHash` — a match returns the cached analysis (200, no AI call, "Cache Hit" logged), a mismatch or no prior analysis creates a new `PENDING` row and dispatches the AI call (202, "Cache Miss" logged) — DECISIONS.md D-039
- [x] `BusinessAnalysisService`/`BusinessAnalysisRunnerService`/`BusinessAnalysisController` — `GET/POST /leads/:id/business` (Doc 19); `POST` is a dedicated new `business:analyze` permission (not a reuse of `leads:write` — D-043), fire-and-forget dispatch (D-004 precedent, same as M1/M5); runner persists `COMPLETED` (brandBrief + confidenceScore) or `FAILED` (rawResponse truncated to 64KB + validationErrors), reserves a conservative pre-flight cost estimate via `CostService.charge()` then records the real cost computed from actual token counts on the row itself
- [x] Unit tests: 24 new tests (`business-fingerprint.spec.ts`, `business-analysis.service.spec.ts`, `business-analysis-runner.service.spec.ts`, `business-analysis.controller.spec.ts`) plus 1 new `permission.constants.spec.ts` assertion — 307 total in `apps/api` (up from 282); `packages/ai` — 19 new tests (`response-validator.test.ts`, `retry.test.ts`, `ai.service.test.ts` incl. the full escalation ladder and a fake-timers transient-retry case, `anthropic.provider.test.ts`); `packages/shared-types` — 11 new tests (`business-analysis.test.ts`) — 76 total (up from 65)
- [x] Integration tests: `apps/api/test/business-analysis.e2e-spec.ts` — 11 tests covering auth, RBAC (`business:analyze` required for POST, `leads:read` sufficient for GET), cache hit/miss, `LEAD_NOT_FOUND`, and non-UUID validation — 93 e2e total (up from 82)
- [x] Full validation: monorepo typecheck/lint clean, full test suite green (307 unit + 93 e2e in `apps/api`; 19 in `packages/ai`; 76 in `packages/shared-types`), compiled server boots both with and without `ANTHROPIC_API_KEY` set (tolerant-at-boot, same convention as `GOOGLE_PLACES_API_KEY` — fails on actual use, not on startup)
- [ ] **Not done in this environment:** running the migration against a real Postgres — same D-020/D-024/D-029 constraint, explicitly flagged
- [ ] **Deliberately out of scope, per instruction:** website generation, theme selection, CRM UI, frontend — only business analysis was built
- **Status: Implementation complete, pending your approval.**

## M7 — Theme Engine

Before any code was written, the founder required a complete Theme Engine architecture (ThemeProvider abstraction, rule-based selection with AI recommendations, output field types) presented and approved. A follow-up message resolved the brand-field-sourcing/permission forks explicitly, added four required `ThemeConfiguration` fields, a compatibility-validation gate (`THEME_NOT_FOUND` on no match), and a full-ranking requirement (not just a single recommendation) — DECISIONS.md D-044 through D-047.

- [x] `ThemeProvider` interface + `THEME_PROVIDER` DI token (new `packages/themes/src/provider/`) — registry-shaped (unlike M5/M6's swap-shaped provider abstractions, every registered theme is simultaneously available); `StaticThemeRegistry` the sole implementation; 8 named theme definition modules (Restaurant/Salon/Dental/LawFirm/Gym/RealEstate/Medical/Corporate), each a versioned code module with name/version/hash (SHA-256, computed from content at load)/createdAt/updatedAt
- [x] New `packages/themes` package — mirrors `packages/ai`'s structure/build step (`tsc`, CommonJS), so it stays usable by M8 without an apps/api dependency
- [x] Compatibility scorer (`packages/themes/src/scoring/compatibility-scorer.ts`) — 5 weighted checks per theme (industry 40%, layout 20%, accessibility 15%, mobile 10%, component availability 15%), deterministic, no AI; `rankThemes()` scores every registered theme, filters to those clearing `MINIMUM_COMPATIBILITY_SCORE` (50), sorts descending — an empty result is the founder's explicit `THEME_NOT_FOUND` gate, never a forced bad fit
- [x] "AI recommends" step reuses M6's `AiService` gateway (`packages/ai`) — new `theme-recommendation/v1.0` prompt template + `AiService.recommendThemeCategory()`: a single-attempt, transient-retry-only classification (no repair-prompt ladder or model escalation — not warranted for a narrow 8-category classification), never throws, resolves to a `failed` outcome on any error so rule-based ranking always has a fallback path with zero AI dependency
- [x] Brand-identity lock (founder's explicit Decision 1) — `colorPalette`/`typography`/`layoutStyle`/`industry` flow through from `BusinessAnalysis.brandBrief` verbatim, never regenerated or overridden by theme selection; only structural/presentational fields (componentSet, navigationStyle, heroStyle, ctaStyle, cardStyle, footerStyle, animationLevel, imageStyle, sectionOrder, accessibilityProfile, mobilePreferences) come from the selected theme
- [x] Schema: new `ThemeConfiguration` model (7 new enums: NavigationStyle/HeroStyle/CtaStyle/CardStyle/FooterStyle/AnimationLevel/ImageStyle) — versioned per business like `BusinessAnalysis` (`configVersion`, never overwritten), FK to the exact `businessAnalysisId` it was derived from, plus the founder's required fields (`themeName`/`themeVersion`/`themeHash`/`selectedAt`/`selectedByEngineVersion`/`compatibilityScore`) and the full `rankedThemes` JSON array for future manual-override support — DECISIONS.md D-044
- [x] Purely additive migration (`packages/db/prisma/migrations/20260730030000_m7_theme_engine/`) — 7 new enums + 1 new table, no existing table altered
- [x] `ThemeSelectionService`/`ThemeSelectionController` — `GET/POST /leads/:id/theme`; new dedicated `theme:select` permission (not a reuse of `business:analyze` — founder's explicit Decision 2, same role set as `business:analyze`/`discovery:run`); synchronous (unlike M6's fire-and-forget dispatch — a lightweight single AI call plus deterministic scoring is fast enough to complete within the request); cached per `businessAnalysisId` (200 on a repeat call against the same analysis, 201 on a genuinely new selection)
- [x] **Post-review follow-up — CostService integration (DECISIONS.md D-048):** `ThemeSelectionService` now reserves `AI_THEME_RECOMMENDATION_ESTIMATED_COST_USD` ($0.02) via M6's `CostService.charge()` immediately before `recommendThemeCategory()`, and on success records actual `aiRecommendationProvider`/`aiRecommendationModel`/`aiRecommendationPromptTokens`/`aiRecommendationCompletionTokens`/`aiRecommendationTotalTokens`/`aiRecommendationCostUsd`/`aiRecommendationExecutionTimeMs` (7 new nullable `ThemeConfiguration` columns, folded into the not-yet-shipped M7 migration rather than a second migration). A monthly-ceiling rejection (`QuotaExceededException`) is caught by the exact same resilience path as any other AI failure — theme selection still succeeds, rules-only. The token→USD formula was extracted out of `BusinessAnalysisRunnerService` into a shared `apps/api/src/common/cost/ai-cost.util.ts` so M6 and M7 call one function, not two copies — no cost-tracking logic duplicated.
- [x] Unit tests: 24 new tests across `packages/themes` (registry, compatibility scorer incl. AI-boost blending and the Corporate floor), `packages/ai` (theme-recommendation validator + `AiService.recommendThemeCategory`, incl. the "never throws" contract under fake timers), and `apps/api` (`theme-selection.service.spec.ts` incl. the `THEME_NOT_FOUND` path and AI-failure resilience, `theme-selection.controller.spec.ts`, `theme-style.mapper.spec.ts`, +1 permission-matrix assertion), plus 4 more from the CostService follow-up (charge-before-call ordering, quota-exceeded resilience, cost/token/duration persistence on success, fields staying null on AI failure/skip) and 2 more `theme-configuration.test.ts` cases (nullable-vs-missing AI fields) — 335 total in `apps/api` (up from 307), 30 in `packages/ai` (up from 19), 17 in `packages/themes` (new), 89 in `packages/shared-types` (up from 76)
- [x] Integration tests: `apps/api/test/theme.e2e-spec.ts` — 13 tests covering auth, RBAC, cache hit/miss, `BUSINESS_ANALYSIS_NOT_FOUND`, the full AI-recommends+rules-rank flow against the real (unmocked) `StaticThemeRegistry`/compatibility scorer, non-UUID validation, and (added by the follow-up) the cost-ceiling-reached resilience path with `costEvent`/`incrementCounter` assertions on the successful path — 106 e2e total (up from 93)
- [x] Full validation: monorepo build/typecheck/lint clean across all packages/apps, full test suite green (apps/api 335 unit + 106 e2e, packages/shared-types 89, packages/ai 30, packages/themes 17, packages/db 26, packages/cache 11), compiled server boots
- [ ] **Not done in this environment:** running the migration against a real Postgres — same D-020/D-024/D-029/M5/M6 constraint, explicitly flagged
- [ ] **Deliberately out of scope, per instruction:** HTML generation, React components, complete websites, frontend, manual theme override — only a validated `ThemeConfiguration` is produced
- **Status: Implementation complete (incl. CostService follow-up), pending your approval.**

## M8 — Website Generator

The founder is building this module across four internal implementation phases (M8.1 Layout Generator, M8.2 Component Generator, M8.3 Content Binding, M8.4 React/Next.js Assembly) — phase boundaries only, not a roadmap change; the official roadmap (`docs/21-implementation-roadmap.md`) still lists M8 as a single module and is untouched by this phasing.

### Phase M8.1 — Layout Generator

Before any code was written, the founder specified a complete phase brief (objective, inputs/outputs, determinism requirement, validation list) — architecture was then presented (package placement, `LayoutConfiguration` shape, derivation rules, three open forks) and approved before implementation, same pre-implementation gate as every prior module. DECISIONS.md D-049, D-050+.

- [x] Extends M7's theme data model (`packages/themes`) with `sectionComponentMap: Record<sectionId, componentId[]>` on `ThemeDefinitionContent` — closes a real gap (componentSet/sectionOrder were two independent flat lists with no link between them) rather than a fragile name-matching heuristic, per the founder's resolved fork. Populated for all 8 existing theme definitions; a new `static-theme-registry.test.ts` invariant test asserts every componentSet entry is mapped exactly once, keyed only by real sections — DECISIONS.md D-049
- [x] `ThemeConfiguration` (M7) extended with `sectionComponentMap` (copied verbatim from the selected theme, same as every other theme-owned structural field) — amended directly into the still-unshipped M7 migration, same not-yet-shipped rationale as D-048
- [x] New `LayoutConfiguration` Prisma model — versioned per business like `BusinessAnalysis`/`ThemeConfiguration` (never overwritten), FK'd to both `businessAnalysisId` and `themeConfigurationId` for full provenance, every compound structure (pageStructure/navigation/hero/footer/sidebar/grid/responsiveRules/ctaPlacements/componentPlaceholders) stored as Json. New, purely additive migration (`20260731000000_m8_1_layout_generator`)
- [x] New `packages/website-generator` package (mirrors `packages/themes`/`packages/ai`'s structure — real `tsc`/CommonJS build, Prisma/NestJS-free) — `layout/layout-generator.ts`: `generateLayout(brandBrief, themeConfiguration)`, a pure, deterministic function (fixed lookup tables + arithmetic only, no AI call, no `Date.now()`/`Math.random()`, no I/O) producing page structure, navigation/hero/footer/sidebar layout, grid definitions, responsive rules, CTA placements, and component placeholders — structure only, no HTML/React/content/images generated, per the founder's explicit exclusions
- [x] `layout/layout-validator.ts`: `validateLayoutConfiguration()` — post-generation invariant checks (required sections exist, responsive rules exist, accessibility constraints, navigation integrity, section ordering). Founder's resolved fork: since inputs are already M6/M7-validated and every rule is a fixed lookup, a failure here is an internal bug, not a business outcome — throws a plain `Error`, never a new domain exception/HTTP code (unlike M7's `THEME_NOT_FOUND`)
- [x] `apps/api/src/layout-engine/` — `LayoutGenerationService`/`LayoutGenerationController`, `GET/POST /leads/:id/layout`, new dedicated `layout:generate` permission (founder's resolved fork: ship the endpoint this phase, same role set as `theme:select`/`business:analyze`), cached per `themeConfigurationId`; new `ThemeConfigurationNotFoundException` (`THEME_CONFIGURATION_NOT_FOUND`, 404) for the hard M7 dependency
- [x] Unit tests: 28 new in `packages/website-generator` (18 generator incl. a determinism assertion, 10 validator), 12 new in `apps/api` (8 service, 4 controller), 1 new invariant test in `packages/themes`, 13 new in `packages/shared-types` (`layout-configuration.test.ts`) — 347 total in `apps/api` (up from 335), 18 in `packages/themes` (up from 17), 28 in `packages/website-generator` (new package), 102 in `packages/shared-types` (up from 89)
- [x] Integration tests: `apps/api/test/layout.e2e-spec.ts` — 12 tests covering auth, RBAC, cache hit/miss, `THEME_CONFIGURATION_NOT_FOUND`, the full real (unmocked) `generateLayout()`/`validateLayoutConfiguration()` flow, and non-UUID validation — 118 e2e total (up from 106)
- [x] Full validation: monorepo build/typecheck/lint clean across all packages/apps, full test suite green
- [ ] **Not done in this environment:** running the migration against a real Postgres — same constraint as every prior module
- [ ] **Deliberately out of scope, per instruction:** component generation, content binding, React generation, Next.js generation — those are M8.2/M8.3/M8.4
- **Status: Phase M8.1 implementation complete, pending your approval. M8.2/M8.3/M8.4 not started.**

## M9 — Website Preview

- [ ] Not started.

## M10 — Sales CRM

- [ ] Not started.

## M11 — Deployment

- [ ] Not started.

## M12 — Analytics & Reporting

- [ ] Not started.

## Backlog — not currently in the numbered roadmap

Carried forward from the old plan's M10/M11, not silently dropped — see docs/21-implementation-roadmap.md §5 and DECISIONS.md D-022 for context and next-step options.

- [ ] **Team & Settings** — `/team` endpoints (invite, role change), `/settings/profile` endpoint, Team & Settings UI. Not started.
- [ ] **Observability & Hardening** — full role-authorization test pass, cross-module cost-governance load test, alerting verification, OWASP security review, internal launch checklist sign-off. Not started. This was a non-negotiable pre-launch gate in the old plan — needs an explicit home before internal launch, not just a backlog entry.
