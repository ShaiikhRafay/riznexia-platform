# Module Review Report — F5: Google Places Synchronization (Frontend)

**Status:** Module F5 implementation complete, pending founder approval.
**Date:** 2026-08-04
**Reviewed against:** the founder's F5 module brief (Place Sync Dashboard, Sync Job History, Sync Job Details; start/resume synchronization, search parameters, progress summary, latest status; DataTable-based history with backend-appropriate pagination, status badges, and the real count fields; job details showing only backend fields, "never invent fields"; status-based polling that stops on terminal states, "never simulate progress"; `discovery:read`/`discovery:run` permissions, no new permissions; reuse of DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell; `src/features/place-sync/` following the existing feature architecture), with several fields explicitly hedged in the brief itself ("if supported"/"if returned"/"if available"). No backend API was modified; no previous frontend module was modified beyond one additive `NAV_ITEMS` entry (and its one mechanically-updated pre-existing test assertion), both explicitly approved by the founder before implementation.

---

## 1. Scope Compliance

| Requirement                                                                      | Delivered          | Where                                                                                                  |
| -------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| Place Sync Dashboard                                                             | ✅                 | `PlaceSyncDashboardPage`                                                                               |
| Sync Job History                                                                 | ✅                 | `PlaceSyncHistoryPage` → `PlaceSyncHistoryTable`                                                       |
| Sync Job Details                                                                 | ✅                 | `PlaceSyncJobDetail`                                                                                   |
| Start new synchronization                                                        | ✅                 | `PlaceSyncSearchForm`                                                                                  |
| Resume existing synchronization (if supported)                                   | ✅ (not supported) | Omitted entirely — no backend concept exists — DECISIONS.md D-142                                      |
| Search parameters                                                                | ✅                 | city/category/keyword/latitude/longitude/radiusMeters, exactly `createPlaceSyncJobSchema`'s fields     |
| Progress summary / Latest synchronization status                                 | ✅                 | `PlaceSyncLatestStatus`                                                                                |
| DataTable, Search, Sorting, Pagination according to backend                      | ✅                 | Full `client` mode — `GET /place-sync-jobs` has zero params — DECISIONS.md D-146                       |
| Status badges                                                                    | ✅                 | `StatusBadge` via `PLACE_SYNC_STATUS_PRESENTATION`                                                     |
| Started At / Completed At / Imported / Updated / Failed Count columns            | ✅                 | Map to real fields `startedAt`/`finishedAt`/`businessesCreated`/`businessesUpdated`/`businessesFailed` |
| Job Status, Search Parameters, Processed/Imported/Updated/Failed Count, Timeline | ✅                 | `PlaceSyncJobDetail`                                                                                   |
| Current Page Token (if returned)                                                 | ✅ (not returned)  | Omitted entirely — no such field exists anywhere — DECISIONS.md D-145                                  |
| Error Message (if available)                                                     | ✅                 | Shown only when `errorMessage` is non-null                                                             |
| Last Updated                                                                     | ✅ (derived)       | Most recent real timestamp — DECISIONS.md D-143                                                        |
| "Never invent fields"                                                            | ✅                 | Verified against `place-sync-job-response.dto.ts` directly                                             |
| Poll while running, stop on terminal, never simulate progress                    | ✅                 | `usePlaceSyncJob`, status-based `PlaceSyncProgress`, no percentage anywhere                            |
| `discovery:read`/`discovery:run`, no new permissions                             | ✅                 | Identical strings reused from F3                                                                       |
| Reuse DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell         | ✅                 | All six reused directly, zero duplication                                                              |
| `src/features/place-sync/`, existing architecture                                | ✅                 | Mirrors `src/features/discovery/` file-for-file                                                        |
| No backend API modified                                                          | ✅                 | `git status apps/api packages/db` unchanged from before F5 (§2)                                        |
| No previous frontend module modified beyond one approved addition                | ✅                 | One `NAV_ITEMS` entry + its test — §2                                                                  |
| Unit tests                                                                       | ✅                 | 10 new                                                                                                 |
| Integration tests                                                                | ✅                 | 21 new                                                                                                 |
| Documentation                                                                    | ✅                 | TASKS.md, CHANGELOG.md, DECISIONS.md (D-141 through D-148), this report                                |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F5 began (the same M10-M12 changes from earlier sessions) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, exactly one previously-shipped file changed: `src/lib/auth.ts`, where one new `NAV_ITEMS` entry (`{id: 'place-sync', label: 'Place Sync', href: '/discovery/sync', requiredPermission: null}`) was added — a founder-approved, purely additive data entry, not a change to any F1/F3 page's own behavior. Its one mechanical consequence, `src/lib/auth.test.ts`'s exact-list assertion, was updated to match. No other F1, RBAC Alignment, F2, F3, or F4 file was touched. Every request F5 makes targets one of the three existing Place Sync endpoints (`GET/POST /place-sync-jobs`, `GET /place-sync-jobs/:id`) — no new endpoint, no new query parameter, no modified or new permission.

## 3. Backend Gaps — Hedged in the Brief, Confirmed by Research, Resolved by Approval

The founder's own brief pre-hedged several fields ("if supported", "if returned", "if available"), anticipating that research might not confirm them. It didn't, for two; research also surfaced two further gaps the brief hadn't hedged:

1. **"Resume existing synchronization" — hedged, and genuinely not supported.** `PlaceSyncJobStatus` has no `PAUSED` value, and the controller has only three routes total. **Approved:** omit entirely — no client-side simulation of a resume that doesn't exist. See DECISIONS.md D-142.
2. **"Current Page Token" — hedged, and genuinely never returned.** Google's page-token pagination is consumed and discarded within a single server-side run, never persisted to the job row. **Resolved directly** (the brief's own hedge already authorized this): no section at all, not even a placeholder — distinct from Lead Details' D-135 resolution, since that gap was an unhedged, explicitly-required section. See DECISIONS.md D-145.
3. **"Last Updated" — not hedged, but no backing field exists.** `PlaceSyncJob` has no `updatedAt` column, and `createdAt` isn't even part of the API response. **Approved:** derive from the most recent real timestamp (`finishedAt` else `startedAt` else "No activity yet"). See DECISIONS.md D-143.
4. **No reserved nav slot — not hedged, discovered during route planning.** F1's own `/discovery` placeholder was labeled "F3 / F5", anticipating this exact situation, but F3 fully took the base route. **Approved:** one new additive `NAV_ITEMS` entry, nested routes under `/discovery/sync/*`. See DECISIONS.md D-141.

Two further mapping decisions were made directly, without a founder round-trip, since each has one clearly correct resolution over real data rather than more than one reasonable option: "Processed Count" as a computed sum of the three real per-outcome counters (D-144), and Sync Job History's fully client-mode DataTable, matching D-130's already-established precedent for the identical no-params backend shape (D-146).

## 4. Implementation Summary

**`src/features/place-sync/`** (new feature folder, mirroring `src/features/discovery/` exactly):

- `status.ts` — `PLACE_SYNC_STATUS_PRESENTATION` (5 statuses), `PLACE_SYNC_STATUS_OPTIONS`, `isTerminalPlaceSyncStatus()` (three terminal outcomes).
- `api/use-place-sync-jobs.ts`, `api/use-place-sync-job.ts` (3s poll-while-non-terminal), `api/use-create-place-sync-job.ts` — one hook per real endpoint.
- `components/place-sync-search-form.tsx` — search parameters, `discovery:run`-gated.
- `components/place-sync-history-columns.tsx`, `components/place-sync-history-table.tsx`, `components/place-sync-history-page.tsx` — full client-mode `<DataTable/>`.
- `components/place-sync-progress.tsx` — three-outcome status-based progress.
- `components/place-sync-latest-status.tsx`, `components/place-sync-dashboard-page.tsx` — Dashboard composition.
- `components/place-sync-job-detail.tsx` — Job Details page composition.

**`app/(dashboard)/discovery/sync/page.tsx`**, **`.../history/page.tsx`**, **`.../[jobId]/page.tsx`** (new routes; the `[jobId]` route is this app's third dynamic route, following the same Next.js 15 async-`params` pattern as F3/F4).

**`src/lib/auth.ts`** — one additive `NAV_ITEMS` entry (D-141).

## 5. Test Coverage

| Suite                                              | Tests | Notes                                                                                                                                                                                    |
| -------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status.test.ts`                                   | 4     | Presentation map covers all 5 statuses, three-outcome terminal check                                                                                                                     |
| `use-place-sync-job.test.tsx`                      | 2     | Fake-timers proof: polls every 3s while running, stops on `completed`, and separately stops on `partial`                                                                                 |
| `place-sync-progress.test.tsx`                     | 4     | All 4 render branches — normal track, current-step marking, `failed`, `partial` (distinct from each other)                                                                               |
| `place-sync-search-form.test.tsx` (integration)    | 3     | Empty submission caught by the real backend with its exact message shown, successful submission posts exact body + navigates, radius-max rejection                                       |
| `place-sync-history-table.test.tsx` (integration)  | 4     | Renders every job with status badge + real counts, global search filters client-side, links to job detail, empty state                                                                   |
| `place-sync-latest-status.test.tsx` (integration)  | 3     | Shows the most recent job's real counts, empty-list message, inline error state                                                                                                          |
| `place-sync-job-detail.test.tsx` (integration)     | 7     | Renders only backend fields with no Current Page Token section, conditional Error Message shown/hidden, Last Updated derivation (finishedAt/startedAt/"No activity yet"), 404 ErrorState |
| `place-sync-dashboard-page.test.tsx` (integration) | 4     | New Synchronization form shown/hidden by `discovery:run`, latest-status panel always renders                                                                                             |

**Totals:** 31 new tests (10 unit, 21 integration). `apps/admin-web` 194/194 (up from 163). `packages/ui` unchanged at 33/33 (F5 needed no new shared primitives). Full monorepo build/typecheck/lint/test clean; a real `next build` re-run clean — `/discovery/sync` (5.75 kB), `/discovery/sync/history` (1.83 kB), `/discovery/sync/[jobId]` (2.07 kB), no RSC `'use client'` boundary issue.

## 6. Security Review

- **AuthZ** — `discovery:run` is enforced client-side only for UI convenience (hiding the New Synchronization form); the backend's own guard on `POST /place-sync-jobs` remains the sole real enforcement. `discovery:read` needs no gate since every role holds it, matching F3's own reasoning exactly.
- **No new data exposure** — every field rendered comes directly from the three existing endpoints' own response shapes; "Processed Count" and "Last Updated" are computed/derived from real fields only, never fabricated.
- **Job Details `jobId` comes from the URL path, validated only by the backend** — an unknown id returns the backend's real 404, rendered as an inline `ErrorState`.
- **Polling cannot amplify load** — `usePlaceSyncJob`'s 3s interval stops automatically the moment a job reaches any of its three real terminal statuses.
- **Search form has no injection surface** — client-side validation is per-field only (lengths, numeric ranges); the backend re-validates the actual payload, including the cross-field rule this frontend deliberately doesn't duplicate (D-148).

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application or backend was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1-F4.
- **"Resume existing synchronization" does not exist** — the backend has no resume/pause concept for Place Sync jobs at all; every synchronization is a brand-new job. See DECISIONS.md D-142.
- **"Current Page Token" is not displayable** — no endpoint anywhere returns this field; Google's internal page-token pagination is discarded before the job row is written. See DECISIONS.md D-145.
- **"Last Updated" is always a derived value, never a real `updatedAt`** — for a still-queued job with neither `startedAt` nor `finishedAt`, it reads "No activity yet" rather than a timestamp. See DECISIONS.md D-143.
- **Sync Job History has no server-side pagination, sorting, or search** — a deliberate consequence of D-146, not an oversight: `GET /place-sync-jobs` returns its full top-50 set in one call with no parameters to page, sort, or search server-side.

## 8. Approval Checklist

- [x] All three Pages and every founder-listed Dashboard/History/Details feature delivered, with hedged fields resolved per their own conditional phrasing — §1, §3
- [x] Every unhedged real gap (Last Updated, nav slot) surfaced as an explicit choice and resolved per your approval — §3, DECISIONS.md D-141, D-143
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified beyond the one approved additive `NAV_ITEMS` entry and its mechanical test update — §2
- [x] Every request targets one of the three existing Place Sync endpoints — no new endpoint, no new permission — §2
- [x] Polling stops on all three real terminal statuses, never simulates progress — §1, §6
- [x] DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell reused directly, zero duplicated components — §1, §4
- [x] Real `next build` run, not just typecheck/lint/test — clean, no RSC boundary issue
- [x] Full test suite green (31 new; 194 `apps/admin-web` total)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-141 through D-148) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
