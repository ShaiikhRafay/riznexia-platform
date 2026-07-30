# Module Review Report — M5: Google Places Synchronization

**Status:** Implementation complete, pending founder approval
**Date:** 2026-07-30
**Reviewed against:** `docs/21-implementation-roadmap.md` (frozen roadmap, M1–M12), the M5 module brief (as refined across three rounds of pre-implementation planning)

---

## 1. Scope Compliance

| Requirement                         | Delivered              | Where                                                                                                                                                  |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Search by city                      | ✅                     | `LocationProvider.search({city, category, keyword})` → `PlacesAdapter.searchText`                                                                      |
| Search by coordinates/radius        | ✅                     | `LocationProvider.search({latitude, longitude, radiusMeters})` → `PlacesAdapter.searchNearby`                                                          |
| Search by category                  | ✅                     | `category` param, both search modes                                                                                                                    |
| Search by keyword                   | ✅                     | `keyword` param (text search; takes priority over `category` in the query string)                                                                      |
| Import businesses                   | ✅                     | `BusinessService.upsertByPlaceId` (extended, M1's method)                                                                                              |
| Update existing businesses          | ✅                     | Same upsert path — every business-data field refreshes on every sync (FR-1.7-equivalent)                                                               |
| Detect duplicates                   | ✅ (exact)             | Existing `googlePlaceId` unique-constraint dedupe, extended unchanged — not fuzzy/near-duplicate matching (D-036)                                      |
| Preserve manual edits               | ✅ (by construction)   | No manual-edit path exists anywhere in the system yet; flagged as a future attachment point (D-035)                                                    |
| Store Google Place ID               | ✅ (unchanged from M1) | `Business.googlePlaceId`                                                                                                                               |
| Business Data: Name/Address/Website | ✅ (unchanged from M1) | —                                                                                                                                                      |
| Business Data: Coordinates          | ✅ (new)               | `Business.latitude`/`longitude`, `Decimal(9,6)`                                                                                                        |
| Business Data: Phone                | ✅ (new)               | `Business.phone`                                                                                                                                       |
| Business Data: Rating/Review Count  | ✅ (new)               | `Business.rating`/`reviewCount`                                                                                                                        |
| Business Data: Opening Hours        | ✅ (new)               | `Business.openingHours` (Json, Google's own shape)                                                                                                     |
| Business Data: Photos               | ✅ (new)               | `Business.photos` (Json)                                                                                                                               |
| Business Data: Business Status      | ✅ (new)               | `Business.businessStatus` (`BusinessOperatingStatus` enum)                                                                                             |
| Incremental synchronization         | ✅                     | `syncVersion` increment + `lastSyncedAt`/`websiteDetectedAt` stamps per sync                                                                           |
| Retry failed requests               | ✅                     | `withRetry` (2 attempts, linear backoff) around every individual provider call                                                                         |
| Background job support              | ✅                     | Fire-and-forget in-process dispatch (D-004 precedent), `PlaceSyncJob` row tracks lifecycle                                                             |
| Rate limiting                       | ✅ (unchanged pattern) | `@Throttle({limit: 10, ttl: 60_000})` on `POST /place-sync-jobs`, same as M1's `POST /discovery-jobs`                                                  |
| Pagination                          | ✅                     | `collectSearchPages` — one page per `LocationProvider.search()` call, capped at 3 pages/60 results                                                     |
| Batch processing                    | ✅                     | Bounded-concurrency candidate processing (`processWithConcurrency`, shared with M1)                                                                    |
| Progress tracking                   | ✅                     | `PlaceSyncJob.businessesFound/Created/Updated/Failed`, persisted mid-run (after search) and at completion, not only at the end                         |
| Structured logging                  | ✅                     | `Logger`, matching `DiscoveryRunnerService`'s established convention                                                                                   |
| Error handling                      | ✅                     | Per-candidate `try`/`catch` (job degrades to `PARTIAL`, never fails outright on one bad candidate); typed exceptions (`PlaceSyncJobNotFoundException`) |
| Unit tests                          | ✅                     | 60 new/updated (282 total in `apps/api`, up from 245)                                                                                                  |
| Integration tests                   | ✅                     | 11 new (`place-sync.e2e-spec.ts`, 82 e2e total, up from 71)                                                                                            |

**Provider abstraction (the brief's explicit mandate):** `LocationProvider` interface, `GooglePlacesProvider` the sole implementation, `LOCATION_PROVIDER` DI token. Business logic (`DiscoveryRunnerService` _and_ `PlaceSyncRunnerService`) depends only on the interface — verified by grep: neither file imports `PlacesAdapter` or `GooglePlacesProvider` directly. Applied retroactively to Module M1 per the founder's explicit confirmation (D-033), not just to new M5 code.

**Constraints honored:** no AI business analysis, theme selection, website generation, CRM UI, or frontend code anywhere in this change. Verified by `git diff` scope (touches only `packages/db`, `packages/shared-types`, `apps/api`) and by the module's own test suite never exercising anything outside those packages.

**Roadmap frozen, not touched:** `docs/21-implementation-roadmap.md`'s module list, order, and numbering are unchanged. Only M5's own **Objective**/**Tasks**/**Status**/**Risks**/**Testing Strategy**/**Definition of Done** fields were updated to reflect what was actually delivered (which is substantially broader than that row's original, staleness-refresh-only draft) — the same treatment M3/M4's entries got after those modules shipped.

## 2. Pre-Implementation Architecture Review

Per the brief's own explicit process gate ("review existing architecture, identify conflicts, present the plan, wait for approval before writing code"), the plan went through three rounds of refinement before implementation started — none of the forks below were guessed at:

1. **Business schema shape.** Coordinates/phone/rating/reviewCount/openingHours/photos/businessStatus existed only inside the opaque `placesData` JSON blob. _Resolved via `AskUserQuestion`:_ promoted to real typed columns (recommended option, chosen).
2. **M1 refactor scope.** The "never depend on Google Places directly" rule, read literally, means Module M1's `DiscoveryRunnerService` (which had a direct `PlacesAdapter` dependency) needs refactoring too — a real question about touching a frozen, already-shipped module. _Resolved via `AskUserQuestion`:_ apply the rule everywhere, including M1 (recommended option, chosen).
3. **Provider-abstraction naming.** The founder asked to confirm/rename the abstraction mid-planning. _Resolved:_ the already-presented plan's naming (`LocationProvider`/`GooglePlacesProvider`/`LOCATION_PROVIDER`) already matched exactly what was requested — confirmed explicitly, no plan change resulted.
4. **Two rounds of field additions**, requested directly by the founder rather than surfaced as ambiguities: five `Business` fields (`googleBusinessUrl`, `websiteDetectedAt`, `websiteDetectionMethod`, `syncVersion`, `sourceProvider`) and six `PlaceSyncJob` fields (`startedAt`, `finishedAt`, `duration`, `successRate`, `apiCallsUsed`, `estimatedCost`) — both incorporated into the schema with explicit semantics presented back before implementation began.

Full reasoning for each: `DECISIONS.md` D-033 through D-036.

Two things were surfaced and flagged rather than silently resolved:

- "Preserve manual edits" is satisfied by construction today — no manual-edit path exists for `Business` anywhere in the system (M4 only added `Lead` mutations). No protection machinery was built speculatively; the attachment point is documented for a future manual-edit feature (likely Module M10).
- A coordinate-only sync request has no dedicated locality field available from Google's search-tier field mask; `Business.city` falls back to the full formatted address, which is a known, accepted degradation rather than a silently-wrong value.

## 3. Implementation Summary

**Provider abstraction (`apps/api/src/common/providers/`):** `location-provider.interface.ts` (`LocationProvider`, `LOCATION_PROVIDER` token, `LocationCandidate`/`LocationDetails`/`LocationSearchPage` shapes), `google-places.provider.ts` (`GooglePlacesProvider`, wraps `PlacesAdapter`), `providers.module.ts` (the single DI wiring point both `DiscoveryModule` and `PlaceSyncModule` import).

**Adapter changes (`apps/api/src/common/adapters/places.adapter.ts`):** `searchText`/new `searchNearby` each fetch one page per call (no internal loop); widened `FULL_DETAILS_FIELD_MASK` (phone, coordinates, opening hours, business status, Google Maps URL). Pagination loop moved to `apps/api/src/common/utils/paginate-search.ts` (`collectSearchPages`), shared by both M1 and M5.

**Schema (`packages/db/prisma/schema.prisma`, migration `20260730010000_m5_place_sync`):**

- `Business`: 7 promoted-to-typed fields (latitude/longitude/phone/rating/reviewCount/openingHours/photos/businessStatus) + 7 founder-requested fields (googleBusinessUrl/websiteDetectedAt/websiteDetectionMethod/syncVersion/sourceProvider/lastSyncedAt/lastSyncJobId).
- New `PlaceSyncJob` model — search params, `PlaceSyncJobStatus` (incl. `PARTIAL`), and the six founder-requested progress/cost fields plus per-run business counters.
- Four new enums: `BusinessSourceProvider`, `WebsiteDetectionMethod`, `BusinessOperatingStatus`, `PlaceSyncJobStatus`.
- Migration hand-authored (no live database in this environment, same constraint as D-020/D-024/M4) via `prisma migrate diff --from-schema-datamodel` between the pre-M5 and current schema files (no DB needed for that comparison) — purely additive, no backfill required.

**Contracts (`packages/shared-types/src/place-sync-job.ts`):** `createPlaceSyncJobSchema` (city+category/keyword, or latitude+longitude, mirroring `LocationProvider.search()`'s own fork), `placeSyncJobSchema`, `PLACE_SYNC_JOB_STATUSES`, `LOCATION_SOURCE_PROVIDERS`.

**Services:**

- `BusinessService.upsertByPlaceId` — all M5 fields optional (M1's existing call shape needs no change); `syncVersion` starts at 1 on create, atomically increments on update; `lastSyncedAt`/`websiteDetectedAt` stamped on every call.
- `PlaceSyncRunnerService` (`apps/api/src/place-sync/`) — retries (`withRetry`, 2 attempts, linear backoff) around every provider call; bounded-concurrency batch processing; progress persisted mid-run; final status resolved to `COMPLETED`/`PARTIAL`/`FAILED` from actual per-candidate outcomes.
- `PlaceSyncService`/`PlaceSyncController` — `POST/GET /place-sync-jobs`, `GET /place-sync-jobs/:id`; reuses M3's `discovery:run`/`discovery:read` permissions, same cost-ceiling pre-flight and `@Throttle` pattern as `POST /discovery-jobs`.
- `DiscoveryRunnerService` refactored onto `LOCATION_PROVIDER` (D-033) — behavior unchanged, dependency shape changed.

**Logging:** `Logger` on `PlaceSyncRunnerService`/`PlaceSyncService`, same convention as `DiscoveryRunnerService`/`DiscoveryService`.

## 4. Test Coverage

| Suite                                                | Tests | Notes                                                                                                                         |
| ---------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared-types` (`place-sync-job.test.ts`)   | 13    | `createPlaceSyncJobSchema`'s city-vs-coordinates fork, status/provider enum validation                                        |
| `google-places.provider.spec.ts`                     | 11    | Search routing (nearby vs. text), candidate/details mapping, unrecognized-status handling                                     |
| `paginate-search.spec.ts`                            | 4     | Page-loop, cap, `onPage` hook                                                                                                 |
| `retry.spec.ts`                                      | 3     | Success-first-try, retry-then-succeed, exhausted-retries                                                                      |
| `place-sync-runner.service.spec.ts`                  | 8     | Status lifecycle incl. `PARTIAL`/`FAILED` resolution, retry-then-succeed, field passthrough, present-candidate skip semantics |
| `place-sync.service.spec.ts`                         | 6     | Job creation, quota pre-flight, fire-and-forget dispatch, not-found handling                                                  |
| `place-sync.controller.spec.ts`                      | 3     | Route delegation                                                                                                              |
| `places.adapter.spec.ts` (rewritten)                 | 18    | One-page-per-call contract, `searchNearby`, widened field mask                                                                |
| `discovery-runner.service.spec.ts` (rewritten)       | 10    | Same M1 behavioral guarantees, now against `LocationProvider`                                                                 |
| `business.service.spec.ts` (extended)                | +5    | `syncVersion` increment, `sourceProvider` default, timestamp stamping, field passthrough, `lastSyncJobId` omission            |
| `apps/api/test/place-sync.e2e-spec.ts`               | 11    | Auth, validation fork, RBAC (Viewer 403), quota, job reads                                                                    |
| `apps/api/test/discovery.e2e-spec.ts` (updated mock) | —     | Unchanged assertions, adapter mock reshaped for the new contract                                                              |

**Totals:** `apps/api` unit 282/282 passing (up from 245), e2e 82/82 passing (up from 71). `packages/shared-types` 65/65 passing (up from 52). Full monorepo typecheck/lint clean for `apps/api`, `packages/db`, `packages/shared-types`.

## 5. Security Review

- **AuthN unchanged** — Clerk remains the sole authentication provider (no code touched here).
- **AuthZ** — `POST /place-sync-jobs` requires `discovery:run`, both `GET`s require `discovery:read` — Module M3's existing permission set, no new permissions added or needed. Verified in `place-sync.e2e-spec.ts` (a Viewer, lacking `discovery:run`, gets 403).
- **Cost governance unchanged in mechanism** — `CostService.charge()`'s atomic reserve-then-log pattern (D-010) is reused as-is; the pre-flight quota check in `PlaceSyncService.createJob` mirrors `DiscoveryService.createJobs` exactly. Verified: `POST /place-sync-jobs` returns 429 `QUOTA_EXCEEDED` and never creates a job row when already at the ceiling.
- **Input validation** — `createPlaceSyncJobSchema` rejects a request with neither a city nor coordinates, and a city search with neither category nor keyword (no ambiguous/empty search would reach the provider layer); UUID path params use `ParseUUIDPipe`.
- **No secrets/PII newly logged** — log lines carry only job/candidate/place IDs and enum values, consistent with Doc 15 §3/§7.
- **SSRF protection unchanged** — website fetches for classification still go through the existing `WebsiteFetchAdapter` (SSRF-guarded), untouched by this module.

## 6. Known Limitations (flagged, not hidden)

- The migration has not been run against a real Postgres instance — this environment has no live database, same constraint as every prior module's migration (D-020, D-024, D-029).
- A coordinate-only sync request has no dedicated locality field from Google's search-tier field mask; `Business.city` falls back to the candidate's full formatted address (D-036).
- `PlaceSyncRunnerService`'s per-page cost charge (inside `collectSearchPages`'s `onPage` hook) is more granular than M1's single per-search-operation charge — a deliberate improvement for M5's own `apiCallsUsed`/`estimatedCost` reporting fields, not a change to M1's existing (unchanged) charging behavior.
- `googleBusinessUrl` is a Google-specific column name on `Business` (the founder's literal request); the equivalent field is named generically (`profileUrl`) in the `LocationDetails` provider-agnostic interface, with the Google-specific name only appearing at the write boundary — flagged as the one place naming intentionally diverges between the DB and the abstraction layer.
- `CSVImportProvider`'s eventual interface shape will likely need to diverge from `LocationProvider.search()`/`getDetails()` (file-based ingestion doesn't fit a "search then fetch details" model) — noted during planning, explicitly out of scope for M5.

## 7. Approval Checklist

- [x] Architecture reviewed before implementation; conflicts surfaced and resolved with the founder, not guessed at
- [x] Roadmap not renamed/reordered/merged/split — only M5's own status fields updated
- [x] All stated requirements delivered, including both rounds of founder-requested field additions
- [x] All stated constraints honored (no AI analysis, no theme/website generation, no CRM UI, no frontend)
- [x] Full test suite green (282 unit + 82 e2e in `apps/api`; 65 in `packages/shared-types`; 26 in `packages/db`)
- [x] Full monorepo typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md, docs/21 M5 entry updated
- [x] Self-review complete, this report generated

**Awaiting founder approval before Module M6.**
