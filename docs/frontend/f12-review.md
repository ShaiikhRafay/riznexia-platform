# Module Review Report — F12: Analytics & Reporting (Frontend)

**Status:** Module F12 implementation complete, pending founder approval.
**Date:** 2026-08-07
**Reviewed against:** the founder's F12 module brief (Analytics Dashboard, Analytics Reports, Business Analytics, Usage Analytics, System Monitoring, Cost Analytics, Audit Logs, User Activity; Dashboard's Business Analytics/Usage Analytics/System Monitoring/Audit Activity/User Activity metric lists; Reports' fifteen named reports, "implement pages for all backend reports"; Filters' "support the real backend filters only... Daily/Weekly/Monthly/Yearly/Custom Range... do not invent filters"; Charts' "use only the existing project UI strategy... do not introduce unnecessary chart libraries"; Exports' "support only the formats implemented by backend... do not fake unavailable formats"; `analytics:view`/`report`/`export`/`manage` permissions, hide inaccessible pages, never bypass permission checks; reuse of Skeletons/ErrorState/EmptyState/Retry; "frontend only... never modify backend/database/APIs... never invent data... never calculate business data that already exists on the backend... reuse existing hooks whenever possible... before changing any previous module, verify it is absolutely necessary"). No backend API was modified; no previous frontend module was modified at all.

---

## 1. Scope Compliance

| Requirement                                                                                      | Delivered                   | Where                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analytics Dashboard                                                                              | ✅                          | `AnalyticsDashboardPage`                                                                                                                                        |
| Analytics Reports                                                                                | ✅                          | `AnalyticsReportsPage`                                                                                                                                          |
| Business Analytics                                                                               | ✅                          | `BusinessAnalyticsPage`                                                                                                                                         |
| Usage Analytics                                                                                  | ✅                          | `UsageAnalyticsPage`                                                                                                                                            |
| System Monitoring                                                                                | ✅                          | `SystemMonitoringPage`                                                                                                                                          |
| Cost Analytics                                                                                   | ✅                          | `CostAnalyticsPage`                                                                                                                                             |
| Audit Logs                                                                                       | ✅                          | `AuditLogsPage`                                                                                                                                                 |
| User Activity                                                                                    | ✅                          | `UserActivityPage`                                                                                                                                              |
| Dashboard's 8 real composed widgets, grouped under the founder's own headings                    | ✅                          | Direct `AnalyticsDashboard.widgets` fields — DECISIONS.md D-189                                                                                                 |
| "Lead Discovery/Business Analysis/CRM Performance/Growth Metrics" (no dedicated dashboard field) | ✅ (mapped to real widgets) | `leads`/`aiUsage.totalAnalyses`/`sales`/`conversion` respectively                                                                                               |
| "API Usage"/"Preview Usage"/"Business Growth" (no backend data source at all)                    | ✅ (honestly not built)     | DECISIONS.md D-191                                                                                                                                              |
| "Implement pages for all backend reports"                                                        | ✅                          | All 15 real `REPORT_TYPES` selectable on `AnalyticsReportsPage`, one real renderer each                                                                         |
| Fifteen named reports in the brief (12 map cleanly, 3 don't exist on the backend)                | ✅                          | DECISIONS.md D-191; the 3 real backend types the brief didn't name (`user_activity`/`error`/`executive_dashboard`) are still built                              |
| Daily/Weekly/Monthly/Yearly/Custom Range, "do not invent filters"                                | ✅                          | `PeriodRangeSelect` — all 5 real `AGGREGATION_PERIODS`, Custom Range with a real date picker                                                                    |
| "Use only the existing project UI strategy... no chart library"                                  | ✅                          | `BarList` — hand-rolled proportional bars, same precedent as F2's `CrmPipelineSection`                                                                          |
| "Support only the formats implemented by backend"                                                | ✅                          | `ExportCsvButton` — CSV only, never offers PDF/Excel — DECISIONS.md D-192                                                                                       |
| `analytics:view`/`report`/`export`/`manage`, hide inaccessible pages                             | ✅                          | `AnalyticsViewGate`/`AnalyticsReportGate`/`PermissionGate` on the export button; `analytics:manage` has no action anywhere yet (backend enforces it on nothing) |
| Skeletons/ErrorState/EmptyState/Retry                                                            | ✅                          | Reused throughout; every empty state is a real backend-returned empty array, never fabricated                                                                   |
| `src/features/analytics/`, existing architecture                                                 | ✅                          | Mirrors `src/features/deployment/`'s structure                                                                                                                  |
| No backend API modified                                                                          | ✅                          | `git status apps/api packages/db` unchanged from before F12 (§2)                                                                                                |
| No previous frontend module modified                                                             | ✅                          | Zero files — not even a `NAV_ITEMS` entry, since one already existed — §2                                                                                       |
| Unit tests                                                                                       | ✅                          | 26 new                                                                                                                                                          |
| Integration tests                                                                                | ✅                          | 50 new                                                                                                                                                          |
| Navigation tests                                                                                 | ✅                          | `analytics-sub-nav.test.tsx` — active-state highlighting across all 8 destinations                                                                              |
| Permission tests                                                                                 | ✅                          | Every page + both gates + export button tested across roles                                                                                                     |
| Documentation                                                                                    | ✅                          | TASKS.md, CHANGELOG.md, DECISIONS.md (D-189 through D-193), this report                                                                                         |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F12 began — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, F12 required **zero changes to any previously-shipped file** — not even the usual one additive `NAV_ITEMS` entry, since `{ id: 'analytics', href: '/analytics', requiredPermission: 'analytics:view' }` already existed (RBAC Alignment). Only the placeholder body of `app/(dashboard)/analytics/page.tsx` was replaced — same category of change F3/F10 already established and got approval for. `useAnalyticsDashboard()` (F2) is reused via its existing hook signature, unmodified. Every request F12 makes targets one of the three real M12 endpoints (§3) — no new endpoint, no new query parameter, no modified or new backend permission.

## 3. Backend Reality vs. the Brief — No Escalated Gap, Five Resolved Directly

Research read all four M12 engines in full (`apps/api/src/analytics/{dashboard,reporting,export,aggregation}/`), plus every relevant `packages/shared-types` schema (`analytics-dashboard.ts`, `analytics-report.ts`, `analytics-export.ts`, `analytics-aggregation.ts`), before writing any component. The real backend surface is exactly three HTTP endpoints (`GET /analytics/dashboard`, `GET /analytics/reports/:type`, `GET /analytics/reports/:type/export`) composing eight dashboard widgets and fifteen report types — confirmed by grepping every `@Controller` in the module.

**No genuine architectural gap requiring `AskUserQuestion`** — the founder's four brief permissions matched the real `PERMISSIONS` array exactly, and every real report/widget field has a working, real code path.

**Five brief-to-reality mappings were resolved directly**, following F9-F11's established discipline:

1. **Dashboard reuse strategy** (D-189) — F2's home dashboard already renders all eight real widgets. Rather than duplicate eight widget components or awkwardly extend F2's period control (which lacks Custom Range), F12 reuses the _hook_ (`useAnalyticsDashboard()`) directly and builds its own lean, feature-local period+range control and widget-grouping presentation — zero F2 files touched.
2. **Themed pages as summary+deep-link, not re-implementation** (D-190) — Business/Usage/System/Cost Analytics each show a relevant widget slice plus links into the one shared Reports page, so every report's real rendering logic lives in exactly one place (`reports/report-view.tsx`).
3. **Six brief-named concepts have no backend data source at all** (D-191) — API Usage, Preview Usage, Business Growth (no matching `REPORT_TYPES` value or widget field anywhere in M12), plus Growth Metrics/Industry Breakdown/Category Breakdown _as dashboard widgets specifically_ (each is a real, separately-named _report_ instead). None fabricated.
4. **Export offers CSV only** (D-192) — `ExportFormatNotImplementedException` is real or PDF/Excel; the UI never offers them as a choice.
5. **Two environment-specific limitations, not code defects** (D-193) — a pre-existing local Redis/Upstash proxy gap (documented before F12 began) causes `ai_cost`/`health`/`executive_dashboard`/the composed dashboard to 500 locally; a compounding browser-automation-tool-specific TanStack Query online-detection quirk was also diagnosed. Both are fully covered by the test suite (mocked `fetch`, unaffected by either).

## 4. Implementation Summary

**`src/features/analytics/`** (new feature folder):

- `api/` — `use-analytics-report.ts` (`GET /analytics/reports/:type`), `use-export-report.ts` (`GET .../export`, real Blob-download trigger). `useAnalyticsDashboard()` is reused directly from `src/features/dashboard/api/`, not duplicated.
- `use-analytics-period.ts` — feature-local period+range URL state, all 5 real `AGGREGATION_PERIODS` including a real Custom Range setter.
- `format.ts` / `report-labels.ts` — feature-local presentation helpers, same convention as every prior module.
- `components/` — `analytics-sub-nav.tsx` (8-destination in-page nav), `analytics-view-gate.tsx` / `analytics-report-gate.tsx` (the two real permission splits), `period-range-select.tsx`, `export-csv-button.tsx`, `bar-list.tsx` (hand-rolled proportional bars), `stat-primitives.tsx` / `detail-primitives.tsx` (feature-local shells), `report-link-list.tsx`, and all 8 page components.
- `components/reports/` — one renderer per real report type (`lead-funnel-report.tsx` through `executive-dashboard-report.tsx`) plus `report-view.tsx`, the one dispatcher every page reuses.

**`app/(dashboard)/analytics/{page.tsx (replaced), reports,business,usage,system,costs,audit,activity}/page.tsx`** (routes).

## 5. Test Coverage

| Suite                                                             | Tests | Notes                                                                                         |
| ----------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| `format.test.ts`                                                  | 9     | USD/integer/percent/date-time/ms formatting, null handling                                    |
| `use-analytics-period.test.tsx`                                   | 9     | Period read/write, `setCustomRange`, `isCustomRangeIncomplete` in all 3 states                |
| `report-labels.test.ts`                                           | 4     | Exactly 15 labels matching real `REPORT_TYPES`, never the 3 non-existent brief names          |
| `bar-list.test.tsx`                                               | 3     | Empty state, item rendering, proportional bar sizing                                          |
| `analytics-view-gate.test.tsx` / `analytics-report-gate.test.tsx` | 5     | Both real permission splits across roles                                                      |
| `period-range-select.test.tsx`                                    | 5     | All 5 real filters shown, Custom Range date inputs, Apply disabled until both dates filled    |
| `export-csv-button.test.tsx`                                      | 3     | Permission gating, `format=csv` always sent, real download trigger                            |
| `analytics-sub-nav.test.tsx`                                      | 4     | All 8 real hrefs, exact-match vs prefix-match active-state highlighting                       |
| `report-view.test.tsx`                                            | 15    | One test per real report type — dispatcher correctly narrows and routes each                  |
| `analytics-dashboard-page.test.tsx`                               | 4     | Real 8 widgets grouped correctly, Audit/User Activity links, ErrorState on failure, view-gate |
| `analytics-reports-page.test.tsx`                                 | 4     | Default report, all 15 options listed, report switching, export gating, report-gate           |
| `business-analytics-page.test.tsx`                                | 2     | Real widget slice + report links, API/Preview Usage never shown, view-gate                    |
| `usage-analytics-page.test.tsx`                                   | 1     | Real widget slice + report links, API/Preview Usage never shown                               |
| `system-monitoring-page.test.tsx`                                 | 1     | Real Platform Health slice + Health/Error report links                                        |
| `cost-analytics-page.test.tsx`                                    | 1     | Real costs widget + exactly one report link                                                   |
| `audit-logs-page.test.tsx`                                        | 3     | Real paginated data, empty state, report-gate                                                 |
| `user-activity-page.test.tsx`                                     | 3     | Real per-actor data, empty state, report-gate                                                 |

**Totals:** 76 new tests (26 unit, 50 integration) across 18 files in `src/features/analytics`. `apps/admin-web` 465/465 (up from 389), across 121 test files (up from 103). Full monorepo `tsc --noEmit`/lint/test clean; a real `next build` run clean — all 8 F12 routes present (`/analytics` 1.22 kB, `/analytics/reports` 3.77 kB, `/analytics/business` 1.36 kB, `/analytics/usage` 1.35 kB, `/analytics/system` 1.26 kB, `/analytics/costs` 1.26 kB, `/analytics/audit` 1.11 kB, `/analytics/activity` 1.12 kB), no RSC `'use client'` boundary issue.

**Live-browser verification against the real API** (this session's local dev-auth-bypassed backend, real Postgres, real seeded data): systematically curled all 15 report endpoints directly to isolate real backend behavior from environment gaps — 12 of 15 (`lead_funnel`, `conversion_rate`, `sales_performance`, `ai_usage`, `deployment`, `website_generation`, `theme_usage`, `business_category`, `industry`, `error`, `user_activity`, `audit`) return real 200s with real data; the other 3 (`ai_cost`, `health`, `executive_dashboard`) return real 500s traced conclusively to a pre-existing local Redis/Upstash proxy gap unrelated to F12. Verified live in-browser: Sales Funnel report renders a real bar chart from real lead data; AI Usage Report renders real (empty) data with correct empty states; Audit Logs renders real audit entries from actual actions taken earlier in this session (including F11's own domain-registration testing); User Activity renders the real Super Admin fixture's real action count; Export CSV verified fully end-to-end — clicked, real network request fired (`GET .../export?format=csv`, 200 OK), real CSV bytes returned and matched the on-screen table exactly, success toast fired, zero console errors. Business/Usage/System/Cost Analytics pages' structural rendering (sub-nav, headers, period selector, report-link sections with correct real hrefs) confirmed live; their summary-widget sections could not be visually confirmed live due to the same pre-existing cost-data environment gap (§3 item 5) — fully covered instead by the mocked-fetch test suite, including the ErrorState-on-failure path specifically (`analytics-dashboard-page.test.tsx`'s dedicated 500 test).

## 6. Security Review

- **AuthZ** — `analytics:view` gates every page's entry client-side for UI convenience; the backend's own guards on all three M12 routes remain the sole real enforcement. `analytics:report` is enforced as a second, stricter client-side gate exactly matching the real backend split (`GET /analytics/dashboard` needs only `:view`; `GET /analytics/reports/:type` needs `:report`) — confirmed directly against `permission.constants.ts`, not assumed. `analytics:export` gates the one real download action.
- **No new data exposure** — every field rendered comes directly from the three M12 endpoints' own response shapes; the six brief-named concepts with no backend source (D-191) are never fabricated or sent back to the server as if real.
- **Export downloads exactly the backend's own CSV bytes** — no client-side reformatting, no client-computed columns; `toCsv()` is entirely server-side.
- **No client-side business-metric calculation anywhere** — every widget/report number is a passthrough field; the only client-side computation in this module is presentational (proportional bar-width percentages in `BarList`, which is display-only geometry, not a business metric).

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application in production mode was exercised — this session's local verification used the dev-auth bypass documented separately in DECISIONS.md's "Dev Tooling" section; build/tests themselves use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1-F11.
- **This session's local backend cannot serve real cost data** (`ai_cost`/`health`/`executive_dashboard`/composed dashboard all 500) due to a pre-existing, already-documented local Redis/Upstash proxy gap unrelated to F12's own code — see DECISIONS.md D-193. The correct `ErrorState`+Retry behavior for this real failure is proven by the test suite, not by live-browser screenshot, since a second, compounding browser-automation-tool-specific quirk (also diagnosed and documented in D-193) prevented that one specific error path from settling visibly in the live browser tool used this session.
- **"API Usage" and "Preview Usage" have no backend data source anywhere in M12** — a real backend gap (M9's Website Preview module has no analytics rollup at all), not an omission. See DECISIONS.md D-191.

## 8. Approval Checklist

- [x] All eight founder-listed pages delivered, no escalated gap needed — §1, §3
- [x] All fifteen real backend report types built and reachable, including three the brief didn't name by their real identifiers (`user_activity`/`error`/`executive_dashboard`) — §3, DECISIONS.md D-191
- [x] Every brief-to-reality mapping (Dashboard widget grouping, themed-page architecture, six non-existent concepts, export format) resolved directly by this module's own governing rules — §3, DECISIONS.md D-189 through D-192
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] Zero previous frontend files modified — not even a `NAV_ITEMS` entry, since one already existed — §2
- [x] Every request targets one of the three real M12 endpoints — no new endpoint, no new permission — §2
- [x] No chart library introduced — reuses the existing hand-rolled `BarList` strategy — §1, §4
- [x] Real `next build` run, not just typecheck/lint/test — clean, all 8 routes present, no RSC boundary issue
- [x] Full test suite green (76 new; 465 `apps/admin-web` total across 121 files, up from 389)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] Live-browser verification against the real API — 12/15 report types confirmed with real data, Export CSV confirmed end-to-end byte-for-byte, remaining 3 report types' known environment limitation isolated, diagnosed, and documented rather than hidden — §5
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-189 through D-193) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
