# Architecture Decision Log

Short-form ADR log for decisions made _during implementation_ that aren't already captured in `/docs` — i.e., things resolved while writing code, not during the design-review phases. If a decision changes an approved design doc, it's recorded here **and** the doc is updated; this file is the "why," the doc is the "what."

---

## M0 — Platform Foundation

### D-001: `outDir` must not live in a shared base tsconfig

**Context:** `packages/config-typescript/nestjs.json` set `outDir: "./dist"`. TypeScript resolves relative `extends`-inherited paths against the _base config's own directory_, not the consuming project's — so `apps/api`'s build silently compiled into `packages/config-typescript/dist` instead of its own `dist/`. Invisible under `tsc --noEmit` (typecheck ignores `outDir`); only surfaced when the compiled server was actually run.
**Decision:** Shared framework-overlay tsconfigs (`nestjs.json`, `nextjs.json`) never set `outDir`/`rootDir`. Each consuming package's own `tsconfig.json` sets its own.

### D-002: Backend-consumed library packages compile to CommonJS, not ESM

**Context:** `packages/db` and `packages/shared-types` inherited `module: "ESNext"` from the framework-agnostic base config (correct for code a bundler consumes). But they're `require()`'d by `apps/api`'s plain Node runtime (`node dist/main.js`), and Node's ESM auto-detection tried to resolve their extensionless relative imports the ESM way and failed.
**Decision:** Any package under `packages/*` that's a _runtime_ dependency of `apps/api` (not just `apps/web`, which goes through a bundler) overrides `module`/`moduleResolution` to `CommonJS`/`Node` in its own tsconfig, and ships a real `build` script + `dist/` output — never `main`/`types` pointing at raw `.ts` source.

### D-003: ESLint 9 flat config needs one root-composable entry point, not just per-package configs

**Context:** Each package got its own `eslint.config.mjs`, which correctly fixed `pnpm --filter <pkg> lint` (CWD-scoped). But `lint-staged`, invoked from the repo root against a mixed list of staged file paths, failed outright — ESLint 9's flat config resolves **one config file for the whole invocation directory**, not a per-file upward search like the old `.eslintrc` cascade.
**Decision:** `lint-staged` only runs Prettier (which has no such resolution issue — one root `.prettierrc.json` genuinely applies everywhere). ESLint runs via `pnpm turbo run lint` in the same pre-commit hook, which shells out to each package's own correctly-scoped `lint` script.

---

## M1 — Lead Discovery

### D-004: Trigger.dev orchestration is deferred; pipeline logic is a plain injectable service today

**Context:** Doc 16 §9 specifies Trigger.dev as the job orchestrator. Wiring it in for real requires a live Trigger.dev project (API key, `trigger.config.ts`, and their own dev-mode CLI process) — none of which exists yet, and none of which is verifiable in this environment.
**Decision:** The discovery pipeline's business logic lives in `DiscoveryRunnerService`, a plain injectable NestJS service with no Trigger.dev-specific code in it at all. `DiscoveryService` dispatches it via in-process async execution today (fire-and-forget, progress tracked on the `discovery_job` row exactly as the API contract already promises). When Trigger.dev is actually provisioned, wiring `DiscoveryRunnerService.run()` into a `task()` definition is an _additive_ change — the retry/concurrency/observability behavior Trigger.dev adds comes for free without touching the pipeline logic itself.
**Follow-up:** Real Trigger.dev wiring is a small, separate piece of work once a project/API key exists — not blocking, not silently faked.

### D-005: The AI-assisted fallback tier for website classification is deferred to Module M3/M4

**Context:** Doc 20 §5 designs a rare AI-assisted fallback for website-status classification when the heuristic is inconclusive. `packages/ai` (the `AiService` gateway) doesn't exist yet — it's Module M3/M4's deliverable, not M1's.
**Decision:** `WebsiteStatusClassifier` takes an _optional_ injected `AiFallbackClassifier` port. When it's not provided (true today), an inconclusive heuristic result falls straight through to Doc 20 §5's own documented fallback behavior — `outdated`, `confidence: low` — which is exactly what happens if the AI tier itself fails, so no new behavior was invented to cover the gap. Wiring in the real AI tier later means providing that one dependency, not restructuring the classifier.

### D-006: Local Redis dev needs an Upstash-REST-compatible proxy, not a plain Redis container

**Context:** `@upstash/redis`'s client speaks Upstash's HTTP REST protocol. The `redis:7-alpine` container already in `docker-compose.yml` (added in M0, before `packages/cache` had any real content) speaks the standard Redis wire protocol — the two are not interchangeable, and this only became apparent once `packages/cache` needed a real implementation.
**Decision:** Added `serverless-redis-http` (the standard community proxy Upstash itself points to for local development) as a sidecar in `docker-compose.yml`, sitting in front of the existing `redis` service and exposing an Upstash-REST-compatible endpoint on `localhost:8079`. Local `.env` points `UPSTASH_REDIS_REST_URL` at the proxy with a fixed dev token; production points at real Upstash.
**Verification gap:** This environment has no Docker available, so the proxy setup is written but not executable here — tests mock the cache client entirely (same pattern as D-002/M0's Prisma mocking) rather than depending on it.

### D-007: Places API cost figures are named constants, explicitly flagged as estimates

**Context:** Design review §9 already flagged that exact Google Places API (New) SKU pricing needs verification at implementation time rather than being asserted with false confidence.
**Decision:** `apps/api/src/common/cost/cost.constants.ts` holds the per-call-type cost estimates as named, individually-commented constants (not inlined magic numbers), so correcting a figure once real pricing is confirmed is a one-line change with no logic touched.

### D-008: Integration tests run against mocked Prisma/Redis, not a live database, in this environment

**Context:** Doc 13 §2 defines "integration" tests as running against a real ephemeral Postgres. This sandbox has no Docker, so no live Postgres or Redis is reachable here.
**Decision:** Integration tests use NestJS's `TestingModule` with the same DI-token mocking pattern established in M0 (`PRISMA_CLIENT`, and now `REDIS_CACHE`) — real guards, real pipes, real controller/service wiring, mocked data layer. This validates everything except actual SQL/constraint behavior. CI's ephemeral Postgres (Doc 14 §3) is what exercises the real database; that hasn't been run here and should be treated as the remaining verification step before this module is considered fully proven.

### D-009: `apps/api` was missing a `tsconfig.build.json`, so every `*.spec.ts` was shipping in the production build

**Context:** `apps/api/tsconfig.json` only excluded `node_modules`/`dist`/`test` — it never excluded colocated `*.spec.ts` files under `src/`, so `nest build` was compiling every unit test straight into `dist/`. This was true since Module M0 (`health.controller.spec.ts` shipped the same way) but only became visible once M1 added enough spec files to notice while inspecting `dist/` during this module's runtime-boot verification.
**Decision:** Added `apps/api/tsconfig.build.json` (extends `tsconfig.json`, additionally excludes `**/*.spec.ts`) — NestJS's CLI picks this up automatically for `nest build` if present, with no `nest-cli.json` change needed. `tsconfig.json` itself is untouched, so `tsc --noEmit` (typecheck) still covers spec files. Verified: `dist/` now contains zero `.spec.js` files.
