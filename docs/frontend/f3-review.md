# Module Review Report — F3: Lead Discovery (Frontend)

**Status:** Module F3 implementation complete, pending founder approval.
**Date:** 2026-08-04
**Reviewed against:** the founder's F3 module brief (Discovery Jobs, Discovery History, Discovery Progress, Search Filters, Job Details, Pagination, Import Summary — explicitly not Lead Management, CRM, or Google Places), the architecture proposed and approved for it (grounded in the real Discovery backend — `GET/POST /discovery-jobs`, `GET /discovery-jobs/:id` — with an explicit instruction not to invent or assume backend capabilities that don't exist), and one founder-requested improvement folded in before implementation: a reusable, fully generic Data Table in `packages/ui`. No backend API was modified; no previous frontend module (F1, RBAC Alignment, F2) was modified beyond the one-line swap of F1's `<FeaturePlaceholder>` for the real `<DiscoveryPage/>` in `app/(dashboard)/discovery/page.tsx`.

---

## 1. Scope Compliance

| Requirement                                                                                                                                                   | Delivered | Where                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Improvement — Shared Data Table**                                                                                                                           | ✅        | `packages/ui/src/components/data-table/` — DECISIONS.md D-128, D-129                                                                         |
| Generic, no Lead-specific logic                                                                                                                               | ✅        | Proven by its own test suite against a made-up `Widget` type; zero Lead/Discovery import under `packages/ui`                                 |
| Server-side pagination, sorting, global search, column filters, column visibility, row selection, bulk actions, empty/loading/error states, responsive layout | ✅        | All 11 features, each covered by a dedicated test in `data-table.test.tsx`                                                                   |
| Discovery Jobs (create)                                                                                                                                       | ✅        | `DiscoverySearchForm` → `useCreateDiscoveryJob()` → `POST /discovery-jobs`                                                                   |
| Discovery History                                                                                                                                             | ✅        | `DiscoveryHistoryTable` → `useDiscoveryJobs()` → `GET /discovery-jobs`                                                                       |
| Discovery Progress                                                                                                                                            | ✅        | `DiscoveryProgress`, status-based, not percentage-based                                                                                      |
| Search Filters (City, Categories max 5, Radius km)                                                                                                            | ✅        | `DiscoverySearchForm` + `CategoryInput`, exactly `createDiscoveryJobSchema`'s fields                                                         |
| Job Details                                                                                                                                                   | ✅        | `app/(dashboard)/discovery/[jobId]/page.tsx` → `DiscoveryJobDetail`                                                                          |
| Pagination                                                                                                                                                    | ✅        | Client-side, over the existing top-50 `GET /discovery-jobs` response — DECISIONS.md D-130                                                    |
| Import Summary                                                                                                                                                | ✅        | `DiscoveryImportSummary`, `resultsCount` only — DECISIONS.md D-133                                                                           |
| Lead Management **not** built                                                                                                                                 | ✅        | No `/leads`-adjacent code added                                                                                                              |
| CRM **not** built                                                                                                                                             | ✅        | No CRM code added                                                                                                                            |
| Google Places **not** built                                                                                                                                   | ✅        | No Google Places code added                                                                                                                  |
| No backend API modified                                                                                                                                       | ✅        | `git status apps/api packages/db` unchanged from before F3 (§2)                                                                              |
| No previous frontend module modified                                                                                                                          | ✅        | One line in `app/(dashboard)/discovery/page.tsx` (the F1 placeholder itself, always meant to be replaced) — no other F1/RBAC/F2 file touched |
| Permission model: `discovery:read` view, `discovery:run` create                                                                                               | ✅        | `<PermissionGate permission="discovery:run">` around the form only; history has no gate beyond default auth (`discovery:read` is universal)  |
| Unit tests                                                                                                                                                    | ✅        | 30 new (14 discovery + 16 DataTable/StatusBadge)                                                                                             |
| Integration tests                                                                                                                                             | ✅        | 18 new                                                                                                                                       |
| Documentation                                                                                                                                                 | ✅        | TASKS.md, CHANGELOG.md, DECISIONS.md (D-128 through D-133), this report                                                                      |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F3 began (the same M10-M12 changes from earlier sessions) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, only one previously-shipped file changed: `app/(dashboard)/discovery/page.tsx`, where F1's own `<FeaturePlaceholder moduleId="F3 / F5">` (explicitly built as a placeholder for this exact module to replace) was swapped for the real `<DiscoveryPage/>` — no other F1, RBAC Alignment, or F2 file was edited. Every request F3 makes targets one of the three endpoints the approved architecture named (`GET /discovery-jobs`, `POST /discovery-jobs`, `GET /discovery-jobs/:id`) — no new endpoint, no new query parameter, no modified permission.

## 3. "Use the Existing Backend Exactly As It Is" — How Each Constraint Was Verified, Not Assumed

The founder's approval message was explicit: _"Do not invent or assume backend capabilities that do not exist. The frontend must accurately reflect the current backend behavior."_ Each approved decision was checked directly against the real backend source, not inferred from convention:

1. **Client-side pagination.** `GET /discovery-jobs`'s controller was read directly — it takes no query parameters and always returns its full top-50 result set in one response. Building a page-number/cursor UI against it would have implied a capability that doesn't exist. `DiscoveryHistoryTable` pages entirely client-side over data already fully loaded. See DECISIONS.md D-130.
2. **Job Details shows only backend-returned fields.** `GET /discovery-jobs/:id` returns exactly `{id, city, category, status, resultsCount}`. `DiscoveryJobDetail` renders only these four fields — no `createdAt`, no `errorMessage`, since the API returns neither.
3. **Status-based, not percentage-based, progress.** `discovery-runner.service.ts` was read directly: `resultsCount` is written exactly once, in the same transaction that sets `status` to `completed` or `failed` — there is no intermediate quantity a percentage could be derived from. `DiscoveryProgress` is a 3-step status track plus a dedicated failed-state branch, never a numeric estimate. See DECISIONS.md D-131.
4. **Import Summary is `resultsCount` only.** No endpoint in this system returns the individual businesses a job found — that data belongs to a future Lead Management module. `DiscoveryImportSummary` shows the count and a one-line sentence, never a list or drill-in link. See DECISIONS.md D-133.
5. **Category filter is free-text, not a select.** Discovered during column implementation, not pre-listed in the architecture: `createDiscoveryJobSchema` validates only length/count on categories, not membership in a closed set — categories are arbitrary strings a rep types. A `select` filter was drafted first and reconsidered before any test was written, since it would have fabricated a taxonomy the API doesn't have. See DECISIONS.md D-132.
6. **Permission model.** `discovery:run` gates the New Search form (`<PermissionGate>`); `discovery:read` — held by every one of the 6 roles per the backend's own grant table — needs no gate on the history view, matching the approved model exactly.

## 4. Implementation Summary

**`packages/ui/src/components/data-table/`** (new — the shared improvement, built first): `data-table.tsx` (main component — controlled/uncontrolled dual-mode sorting and pagination, synthetic selection column, `globalFilterFn: 'includesString'`), `data-table-toolbar.tsx` (global search, column filters via `columnDef.meta`, column visibility menu, bulk-actions bar), `data-table-column-header.tsx` (sort-toggle button), `data-table-pagination.tsx` (client and server render branches), `types.ts` (all public types plus a `ColumnMeta` module augmentation).

**`packages/ui/src/components/status-badge.tsx`** (new) — 5-tone CVA variant, colored dot + label, never color-only.

**`packages/ui/src/components/table.tsx` / `checkbox.tsx`** (new) — plain semantic table primitives and a Radix checkbox wrapper (tri-state, for the selection column), both feeding `DataTable`.

**`src/features/discovery/`** (new feature folder):

- `status.ts` — `DISCOVERY_STATUS_PRESENTATION`, `DISCOVERY_STATUS_OPTIONS`, `isTerminalDiscoveryStatus()`, the only place Discovery's domain status knowledge lives.
- `api/use-discovery-jobs.ts`, `api/use-discovery-job.ts` (3s poll-while-non-terminal), `api/use-create-discovery-job.ts` — one hook per real endpoint.
- `components/category-input.tsx`, `components/discovery-search-form.tsx` — the New Search form, `discovery:run`-gated.
- `components/discovery-history-columns.tsx`, `components/discovery-history-table.tsx` — `<DataTable/>`'s first real consumer.
- `components/discovery-progress.tsx`, `components/discovery-import-summary.tsx`, `components/discovery-job-detail.tsx` — Job Details page composition.
- `components/discovery-page.tsx` — top-level page composing the form and history table.

**`app/(dashboard)/discovery/page.tsx`** — F1's placeholder replaced with `<DiscoveryPage/>`.

**`app/(dashboard)/discovery/[jobId]/page.tsx`** (new) — this app's first dynamic route; Next.js 15 async `params` awaited in a server-component wrapper around the client `DiscoveryJobDetail`.

## 5. Test Coverage

| Suite                                            | Tests | Notes                                                                                                                    |
| ------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| `data-table.test.tsx` (`packages/ui`)            | 13    | Every DataTable feature in isolation, against a made-up `Widget` type — the proof of genericness                         |
| `status-badge.test.tsx` (`packages/ui`)          | 3     | Label always visible text, default/variant class checks                                                                  |
| `status.test.ts`                                 | 4     | Presentation map covers all 4 statuses, options derived correctly, terminal-status check                                 |
| `use-discovery-job.test.tsx`                     | 1     | Fake-timers proof: polls every 3s while non-terminal, stops the instant the job completes                                |
| `category-input.test.tsx`                        | 7     | Enter/comma-to-add, duplicate/blank rejection, remove, max-count disable                                                 |
| `discovery-search-form.test.tsx` (integration)   | 3     | Empty-submission validation, exact POST body on success, radius>50 rejected                                              |
| `discovery-history-table.test.tsx` (integration) | 4     | Renders every job with a status badge, global search filters client-side, links to job detail, empty state               |
| `discovery-page.test.tsx` (integration)          | 4     | Form shown for `sales_executive`/`admin` (hold `discovery:run`), hidden for `developer`/`viewer`, history always renders |
| `discovery-progress.test.tsx`                    | 3     | 3-step track for queued, `aria-current="step"` for running, dedicated failed branch                                      |
| `discovery-import-summary.test.tsx`              | 3     | Shows count + sentence when completed, renders nothing otherwise, singular "business" at count 1                         |
| `discovery-job-detail.test.tsx` (integration)    | 3     | Renders only backend-returned fields, `ErrorState` + back-link on 404, no Import Summary while running                   |

**Totals:** 48 new tests (30 unit, 18 integration) across `packages/ui` (16) and `apps/admin-web` (32). `packages/ui` 28/28 (up from 12). `apps/admin-web` 123/123 (up from 91). Full monorepo build/typecheck/lint/test clean; a real `next build` re-run clean — `/discovery` (5.41 kB) and `/discovery/[jobId]` (1.54 kB), no RSC `'use client'` boundary issue.

## 6. Security Review

- **AuthZ** — `discovery:run` is enforced client-side only for UI convenience (`<PermissionGate>` hiding the New Search form); the backend's own guard on `POST /discovery-jobs` remains the sole real enforcement — a stale frontend permission mirror can at worst show a form that then 403s, never bypass the actual create-job authorization.
- **No new data exposure** — every field rendered comes directly from the three existing endpoints' own response shapes; nothing is computed, joined, or inferred client-side.
- **Job Details `jobId` comes from the URL path, validated only by the backend** — an unknown or unauthorized id returns the backend's real 404 (`RESOURCE_NOT_FOUND`), rendered as an inline `ErrorState` with a link back to Discovery, never a raw stack trace or a silent blank page.
- **Polling cannot be used to amplify load** — `useDiscoveryJob`'s 3s interval stops automatically the moment a job reaches a terminal status; it never polls a completed or failed job indefinitely.
- **Category input has no injection surface** — `CategoryInput` only builds a string array client-side for the existing Zod-validated `createDiscoveryJobSchema`; the backend re-validates length/count itself regardless of what the frontend sends.

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application or backend was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1/F2.
- **Discovery History has no server-side pagination, sorting, or search** — a deliberate consequence of D-130, not an oversight: `GET /discovery-jobs` returns its full top-50 set in one call with no parameters to page, sort, or search server-side, so all of DataTable's `'server'` modes are unused here (though fully built and tested — see the Shared Data Table improvement). If the backend ever adds real pagination to this endpoint, only `DiscoveryHistoryTable`'s `pagination`/`sorting` config props need to change, not `DataTable` itself.
- **Category filter accepts any text, including values matching no row** — expected: the backend has no closed taxonomy, so there is no way to offer only valid options without inventing one (D-132).
- **Job Details polling relies on the client staying mounted** — navigating away and back re-triggers the initial fetch and resumes polling from there; there is no background/service-worker-level polling, consistent with every other data-fetching pattern in this app.

## 8. Approval Checklist

- [x] The founder-requested Shared Data Table improvement delivered exactly as specified, generic, no Lead-specific logic — §1, DECISIONS.md D-128/D-129
- [x] Every approved F3 architecture decision verified directly against real backend source, not assumed — §3, DECISIONS.md D-130 through D-133
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified beyond the one placeholder swap F1 itself anticipated — §2
- [x] Lead Management, CRM, Google Places explicitly not built — §1
- [x] Every request targets one of the three endpoints the approved architecture named — no new endpoint, no new call — §2
- [x] Real `next build` run, not just typecheck/lint/test — clean, no RSC boundary issue
- [x] Full test suite green (48 new; 28 `packages/ui` + 123 `apps/admin-web` totals)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-128 through D-133) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
