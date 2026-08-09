# Module Review Report — F2: Dashboard (Frontend)

**Status:** Module F2 implementation complete, pending founder approval.
**Date:** 2026-08-04
**Reviewed against:** the founder's F2 module brief (a Dashboard Home screen consuming existing backend dashboard data), the architecture proposed and approved for it (grounded in the two real backend endpoints — `GET /analytics/dashboard` M12, `GET /crm/dashboard` M10 — rather than the pre-M10 `docs/17` wireframe), and two founder-requested improvements folded in before implementation: a Dashboard Widget Registry, and configurable auto-refresh via TanStack Query. No backend API was modified; no previous frontend module (F1, or the RBAC Alignment pass) was modified beyond the one-line swap of F1's `<FeaturePlaceholder>` for the real `<DashboardHome/>` in `app/(dashboard)/page.tsx`.

---

## 1. Scope Compliance

| Requirement                                   | Delivered | Where                                                                                                                           |
| --------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard Home screen, real data              | ✅        | `app/(dashboard)/page.tsx` → `<DashboardHome/>`                                                                                 |
| Consumes `GET /analytics/dashboard` (M12)     | ✅        | `useAnalyticsDashboard()`                                                                                                       |
| Consumes `GET /crm/dashboard` (M10)           | ✅        | `useCrmDashboard()`                                                                                                             |
| **Improvement 1 — Dashboard Widget Registry** | ✅        | `DASHBOARD_WIDGETS` + `WidgetRegistry` — DECISIONS.md D-123                                                                     |
| Dashboard must not directly know every widget | ✅        | `DashboardHome` renders only `<WidgetRegistry/>`; zero import of any individual widget                                          |
| Extensible for future widgets                 | ✅        | One new widget file + one array entry, verified by structure test                                                               |
| **Improvement 2 — configurable auto-refresh** | ✅        | `RefreshIntervalProvider`/`useQueryRefetchInterval` — DECISIONS.md D-124                                                        |
| Options: Manual / 30s / 1m / 5m               | ✅        | `REFRESH_INTERVAL_OPTIONS`, `RefreshIntervalSelect`                                                                             |
| Uses TanStack Query refetch intervals         | ✅        | `refetchInterval` passed straight into every `useQuery` call, no custom timers                                                  |
| No additional backend endpoints               | ✅        | Verified by scope — three existing endpoints only                                                                               |
| No backend API modified                       | ✅        | `git status apps/api packages/db` unchanged from before F2 (§2)                                                                 |
| No previous frontend module modified          | ✅        | One line in `app/(dashboard)/page.tsx` (the F1 placeholder itself, always meant to be replaced) — no other F1/RBAC file touched |
| Unit tests                                    | ✅        | 20 new                                                                                                                          |
| Integration tests                             | ✅        | 15 new                                                                                                                          |
| Documentation                                 | ✅        | TASKS.md, CHANGELOG.md, DECISIONS.md (D-123 through D-127), this report                                                         |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F2 began (the same M10-M12 changes from earlier sessions) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, only one previously-shipped file changed: `app/(dashboard)/page.tsx`, where F1's own `<FeaturePlaceholder moduleId="F2">` (explicitly built as a placeholder for this exact module to replace) was swapped for the real `<DashboardHome/>` — no other F1 or RBAC Alignment file was edited. Every request F2 makes targets one of the three endpoints named in the approved architecture (`GET /analytics/dashboard`, `GET /crm/dashboard`, `GET /crm/tasks`) — no new endpoint, no new query parameter, no modified permission.

## 3. The Architecture Proposal's Two Open Questions — How They Were Resolved

The approved architecture explicitly flagged two decisions as the founder's call, not assumed:

1. **What does `sales_executive` see?** Resolved as **(a)**, the recommended option: a "My Work" worklist (`GET /crm/tasks?assignedToId=<self>`, an endpoint this role already holds `crm:view` for), not a KPI dashboard it has no data source for and not a bare placeholder. See DECISIONS.md D-125.
2. **Is a charting library needed?** The proposal tentatively defaulted toward Recharts. On actually inspecting all eight M12 widget shapes plus the M10 pipeline-by-stage data, none needed a real chart library — every value is a number, percentage, or small count, and the one genuinely visual need (proportional stage comparison) is a handful of `<div>`s with a Tailwind width percentage. **No charting library was added.** This is a deliberate reversal of the proposal's own tentative default, made once real data shapes were inspected — flagged here, not silently substituted. See DECISIONS.md D-127.

## 4. Implementation Summary

**`src/features/dashboard/`** (new feature folder — the first real consumer of F1's `src/features/<feature>/` convention):

- `refresh-interval.tsx` — `RefreshIntervalProvider`/`useRefreshInterval`/`useQueryRefetchInterval`.
- `use-dashboard-period.ts` — URL-driven (`?period=`) period state, `custom` deliberately excluded from the selectable options (no date-range picker yet).
- `format.ts` — `formatUsd`/`formatInteger`/`formatPercent`.
- `api/use-analytics-dashboard.ts`, `api/use-crm-dashboard.ts`, `api/use-my-tasks.ts` — one TanStack Query hook per backend endpoint.
- `widgets/widget.interface.ts`, `widgets/widget-registry.tsx`, and eight individual widget files.
- `components/widget-card.tsx` (shared loading/error/content shell every widget renders into), `components/period-select.tsx`, `components/refresh-interval-select.tsx`, `components/dashboard-toolbar.tsx`, `components/crm-pipeline-section.tsx`, `components/my-work-panel.tsx`, `components/dashboard-home.tsx`.

**`src/lib/`** (shared across future feature modules, not dashboard-specific): `current-user-context.tsx` (`CurrentUserProvider`/`useCurrentUser`), `query-string.ts` (`toQueryString`).

**`src/components/layout/app-shell.tsx`** — wraps its tree in `CurrentUserProvider` alongside the existing `PermissionsProvider` (RBAC Alignment).

**`app/(dashboard)/page.tsx`** — F1's placeholder replaced with `<DashboardHome/>`.

**One real design decision made during implementation, not merely hypothetical:** `DashboardHome`'s section visibility uses `useHasPermission()` hooks directly for its three-way structural branch (widget grid / CRM section / My Work), while `<PermissionGate/>` (RBAC Alignment) remains reserved for finer, inline gating within a section. Both patterns are now demonstrated in the codebase for their respective use cases — component-level structural composition via hooks, declarative single-element gating via the wrapper component — rather than forcing one pattern to do both jobs.

## 5. Test Coverage

| Suite                                            | Tests | Notes                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format.test.ts`                                 | 4     | USD/integer/percent formatting, null → em dash                                                                                                                                                                                                                                                 |
| `query-string.test.ts`                           | 4     | Skips undefined/null/empty, URL-encodes, empty-params → empty string                                                                                                                                                                                                                           |
| `current-user-context.test.tsx`                  | 2     | Throws outside provider, returns the exact `TeamMember` passed in                                                                                                                                                                                                                              |
| `refresh-interval.test.tsx`                      | 5     | Default manual, `setInterval` updates shared state, `useQueryRefetchInterval` maps manual→`false` and passes numeric values straight through                                                                                                                                                   |
| `use-dashboard-period.test.tsx`                  | 5     | URL read/default/invalid-value fallback, `setPeriod` pushes the URL, switching away from `custom` clears `from`/`to`                                                                                                                                                                           |
| `widget-registry.structure.test.ts`              | 4     | All 8 founder-named widgets present with unique ids, every `requiredPermission` is a real closed-taxonomy permission, every entry has a real component                                                                                                                                         |
| `dashboard-home.test.tsx` (integration)          | 3     | **The core proof of the approved architecture**: admin sees the widget grid + CRM pipeline section; developer sees the widget grid only (no `crm:report`); `sales_executive` sees only "My Work" with its real task data — against a mocked fetch boundary matching the real backend envelopes |
| `period-select.test.tsx` (integration)           | 3     | Defaults to Monthly, never offers Custom, pushes the selected period to the URL                                                                                                                                                                                                                |
| `refresh-interval-select.test.tsx` (integration) | 3     | Defaults to Manual, offers exactly the four founder-specified options, updates its displayed label                                                                                                                                                                                             |
| `dashboard-toolbar.test.tsx` (integration)       | 2     | Renders both selects + the manual refresh button; clicking it invalidates all three dashboard query keys                                                                                                                                                                                       |

**Totals:** 35 new tests (20 unit, 15 integration). `apps/admin-web` 91/91 (up from 56). Full monorepo build/typecheck/lint/test clean; a real `next build` re-run clean, with no RSC `'use client'` boundary issue this time (every new component was marked correctly from the start, applying F1's own D-119 lesson).

## 6. Security Review

- **AuthZ** — every section's visibility is decided by `useHasPermission()`/`usePermissions()` against the real derived permission set (RBAC Alignment); no component branches on `TeamRole` directly. The backend's own guards remain the sole enforcement authority for every one of the three endpoints this module calls — a stale frontend permission mirror can at worst render a section that then 403s gracefully via `<ErrorState/>`, never expose data.
- **No new data exposure** — every field rendered comes directly from the three existing endpoints' own response shapes; nothing is computed, joined, or inferred client-side beyond simple formatting (currency/percent/date display).
- **`assignedToId` filter uses the session's own id, never client-editable** — `useMyTasks()` reads `id` from `useCurrentUser()` (itself sourced from the server-fetched `TeamMember`), not from any URL param or form input a user could tamper with to view another rep's tasks; the backend's own `crm:view` gate would reject an unauthorized query regardless.
- **Auto-refresh cannot be used to bypass rate limiting or amplify load unboundedly** — the fastest selectable interval is 30 seconds, and `refetchIntervalInBackground` is left at its default `false` (polling pauses when the tab isn't focused).

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application or backend was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1.
- **The period selector doesn't drive the CRM pipeline section** — `GET /crm/dashboard` has no `period`/aggregation-bucket parameter of its own (just an optional `fromDate`/`toDate`, which this module doesn't currently expose a control for), so the CRM section always shows all-time data regardless of the toolbar's period selection. Not a bug — the backend contract simply has no period concept for this endpoint; inventing a period→date-range mapping would be assuming a relationship the API doesn't define.
- **`custom` period has no date-range picker UI** — reserved in `AggregationPeriod`'s type and deliberately excluded from `PeriodSelect`'s options, since selecting it without `from`/`to` in the URL would 400 (`INVALID_AGGREGATION_RANGE`).
- **"My Work" is un-totaled by design** — `GET /crm/tasks`/`GET /leads` are both cursor-paginated with no `total` field; a real count would require paging through every result, which doesn't belong on a dashboard. The panel shows the 5 most recent assigned tasks, not "you have N tasks."

## 8. Approval Checklist

- [x] Both founder-requested improvements delivered exactly as specified (Widget Registry, configurable auto-refresh) — §1
- [x] Both architecture-proposal open questions resolved and documented, not decided silently — §3, DECISIONS.md D-125/D-127
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified beyond the one placeholder swap F1 itself anticipated — §2
- [x] Every request targets one of the three endpoints the approved architecture named — no new endpoint, no new call — §2
- [x] Real `next build` run, not just typecheck/lint/test — clean, no RSC boundary issue this time
- [x] Full test suite green (35 new; 91 `apps/admin-web` total)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-123 through D-127) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
