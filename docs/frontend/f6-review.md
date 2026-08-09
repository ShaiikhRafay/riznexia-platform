# Module Review Report — F6: AI Business Analyzer (Frontend)

**Status:** Module F6 implementation complete, pending founder approval.
**Date:** 2026-08-04
**Reviewed against:** the founder's F6 module brief (Business Analysis Dashboard, Analysis History, Analysis Details; select-lead/view-status/run/re-run/cache-status/version/provider-model/execution-status Dashboard features; Analysis Details showing every field the backend returns across the 19 structured `brandBrief` fields plus metadata, "only display fields actually returned, never invent data"; Analysis History honoring "if backend only returns latest analysis, display latest only, do not fabricate history"; polling that stops automatically on a terminal state, "never simulate progress"; `leads:read`/`business:analyze` permissions, no new permissions; reuse of DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell; `src/features/business-analysis/` following the existing feature architecture), with several fields explicitly hedged in the brief itself. No backend API was modified; no previous frontend module was modified beyond one additive `NAV_ITEMS` entry (and its one mechanically-updated pre-existing test assertion), the same category of change F5 already established and received approval for.

---

## 1. Scope Compliance

| Requirement                                                              | Delivered      | Where                                                                                                                           |
| ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Business Analysis Dashboard                                              | ✅             | `BusinessAnalysisDashboardPage`                                                                                                 |
| Analysis History                                                         | ✅             | `BusinessAnalysisHistory`                                                                                                       |
| Analysis Details                                                         | ✅             | `BusinessAnalysisDetails`                                                                                                       |
| Select Lead                                                              | ✅             | `LeadSelect`, reusing F4's real `useLeads()` directly — DECISIONS.md D-155                                                      |
| View current analysis status                                             | ✅             | `BusinessAnalysisStatusPanel`                                                                                                   |
| Run AI Analysis / Re-run Analysis (only when backend allows)             | ✅             | `RunAnalysisButton` — one mutation, label-only difference, since the backend imposes no re-run restriction — DECISIONS.md D-153 |
| Display cache status if returned by backend                              | ✅ (transient) | One-time toast, inferred from the response body — DECISIONS.md D-151                                                            |
| Display analysis version / provider / model / execution status           | ✅             | `BusinessAnalysisStatusPanel`                                                                                                   |
| Every backend-returned field on Analysis Details                         | ✅             | `BusinessAnalysisDetails` — all 19 `brandBrief` fields + full metadata                                                          |
| Prompt Hash                                                              | ✅ (omitted)   | Never displayed — exists in the DB, never serialized to the API — DECISIONS.md D-150                                            |
| "Only display fields actually returned. Never invent data."              | ✅             | Verified against `business-analysis-response.dto.ts` directly                                                                   |
| Version history, latest-only if that's all the backend gives             | ✅             | `BusinessAnalysisHistory` shows exactly one row, with an explicit note — DECISIONS.md D-152                                     |
| Poll while running, stop on terminal, never simulate progress            | ✅             | `useBusinessAnalysis`, status-based `BusinessAnalysisProgress`, no percentage anywhere                                          |
| `leads:read`/`business:analyze`, no new permissions                      | ✅             | Identical strings reused from the backend's own decorators                                                                      |
| Reuse DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell | ✅             | All used where applicable (DataTable has no list to page in this module — D-152)                                                |
| `src/features/business-analysis/`, existing architecture                 | ✅             | Mirrors `src/features/place-sync/`'s structure                                                                                  |
| No backend API modified                                                  | ✅             | `git status apps/api packages/db` unchanged from before F6 (§2)                                                                 |
| No previous frontend module modified beyond one approved addition        | ✅             | One `NAV_ITEMS` entry + its test — §2                                                                                           |
| Unit tests                                                               | ✅             | 4 new                                                                                                                           |
| Integration tests                                                        | ✅             | 27 new                                                                                                                          |
| Documentation                                                            | ✅             | TASKS.md, CHANGELOG.md, DECISIONS.md (D-149 through D-155), this report                                                         |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F6 began (the same M10-M12 changes from earlier sessions) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, exactly one previously-shipped file changed: `src/lib/auth.ts`, where one new `NAV_ITEMS` entry (`{id: 'business-analysis', label: 'Business Analysis', href: '/business-analysis', requiredPermission: null}`) was added, applying F5's D-141 precedent directly. Its one mechanical consequence, `src/lib/auth.test.ts`'s exact-list assertion, was updated to match. No other F1, RBAC Alignment, F2, F3, F4, or F5 file was touched. Every request F6 makes targets the two existing Business Analysis endpoints (`GET/POST /leads/:id/business`) plus F4's own existing `GET /leads`/`GET /leads/:id` (reused, not re-implemented) — no new endpoint, no new query parameter, no modified or new permission.

## 3. Backend Gaps — Hedged in the Brief, Confirmed by Research, Resolved by the Brief's Own Rules

The founder's own brief pre-hedged two Dashboard features and gave Analysis History an explicit conditional instruction. Research against `apps/api/src/business-analysis/` confirmed each, and surfaced one further gap the module's blanket rule already resolves without a fresh approval:

1. **"Re-run Analysis (only when backend allows)" — hedged, and the restriction doesn't exist.** `triggerAnalysis()` never rejects based on the existing analysis's status; it always either returns the cached completed row or creates a new version. **Resolved directly** (the hedge itself anticipated this): one button, one mutation, label-only difference. See DECISIONS.md D-153.
2. **"Cache status if returned by backend" — hedged, and it's not a JSON field.** The real `cacheHit` signal only ever distinguishes the trigger response's HTTP status code (200/202); `apiClient` (a previous-module file) discards status codes after use. **Resolved directly**: inferred from the response body's own `status` value, shown as a one-time toast, never a persistent field. See DECISIONS.md D-151.
3. **"Display latest only if that's all the backend returns" — an explicit instruction, and it is indeed all the backend returns.** No history/versions endpoint exists anywhere in this module. **Resolved directly**, exactly as instructed: History exists as its own page, shows one row, explains why. See DECISIONS.md D-152.
4. **"Prompt Hash" — not hedged, but genuinely never returned.** Exists on the Prisma model, never serialized by the response DTO or the shared-types schema. **Resolved directly** by the module's own governing rule ("only display fields actually returned... never invent data") — no fresh founder decision needed, since that rule already covers exactly this case. See DECISIONS.md D-150.

Routing (one new nav entry, three nested routes) followed F5's D-141 precedent directly rather than re-asking — the same recurring "no reserved nav slot" situation, already resolved and approved once. See DECISIONS.md D-149.

## 4. Implementation Summary

**`src/features/business-analysis/`** (new feature folder, mirroring `src/features/place-sync/`'s structure):

- `status.ts` — `ANALYSIS_STATUS_PRESENTATION` (3 statuses), `ANALYSIS_STATUS_OPTIONS`, `isTerminalAnalysisStatus()`.
- `api/use-business-analysis.ts` (3s poll-while-pending), `api/use-trigger-business-analysis.ts` (no request body).
- `components/lead-select.tsx` — reuses F4's `useLeads()`; its `LeadSearchResults` split exists only to gate the real network request behind a valid 2+ char query, not to wrap the fetch.
- `components/run-analysis-button.tsx` — the shared Run/Re-run mutation trigger + cache-status toast, used by both the Dashboard panel and Analysis Details.
- `components/business-analysis-progress.tsx` — two-step status-based progress + `failed` branch.
- `components/business-analysis-status-panel.tsx`, `components/business-analysis-dashboard-page.tsx` — Dashboard composition (reuses F4's `useLead()` for reload-safe business-name lookup).
- `components/business-analysis-details.tsx` — the exhaustive field dump.
- `components/business-analysis-history.tsx` — the single-row History page.

**`app/(dashboard)/business-analysis/page.tsx`**, **`.../[leadId]/page.tsx`**, **`.../[leadId]/history/page.tsx`** (new routes).

**`src/lib/auth.ts`** — one additive `NAV_ITEMS` entry (D-149).

## 5. Test Coverage

| Suite                                       | Tests | Notes                                                                                                                                                                                                        |
| ------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `status.test.ts`                            | 4     | Presentation map covers all 3 statuses, terminal check                                                                                                                                                       |
| `use-business-analysis.test.tsx`            | 2     | Fake-timers proof: polls every 3s while pending and stops on completion; does not poll at all when the initial response is already terminal (a cache hit)                                                    |
| `lead-select.test.tsx`                      | 4     | 2+ char minimum enforced (no fetch below it), result click calls `onChange` with id + name, no-results message                                                                                               |
| `run-analysis-button.test.tsx`              | 7     | Label switches Run/Re-run, hidden for developer/viewer (no `business:analyze`), cache-hit vs cache-miss toast, backend error shown verbatim                                                                  |
| `business-analysis-status-panel.test.tsx`   | 3     | No-analysis state, completed summary (version/provider/model/execution time), pending "waiting" message                                                                                                      |
| `business-analysis-details.test.tsx`        | 6     | Every metadata + all 19 `brandBrief` fields rendered, no "Prompt Hash" text anywhere, no persistent "Cache Status" text, validation errors shown on a failed analysis, no-analysis-yet state, 404 ErrorState |
| `business-analysis-history.test.tsx`        | 2     | Single-row display with the explanatory note, empty state                                                                                                                                                    |
| `business-analysis-dashboard-page.test.tsx` | 3     | No panel before selection, `?leadId=` pushed on selection, panel renders correctly when `?leadId=` is already in the URL (reload-safe)                                                                       |

**Totals:** 31 new tests (4 unit, 27 integration). `apps/admin-web` 225/225 (up from 194). `packages/ui` unchanged at 33/33 (F6 needed no new shared primitives). Full monorepo build/typecheck/lint/test clean; a real `next build` re-run clean — `/business-analysis` (2.69 kB), `/business-analysis/[leadId]` (5.34 kB), `/business-analysis/[leadId]/history` (1.4 kB), no RSC `'use client'` boundary issue.

## 6. Security Review

- **AuthZ** — `business:analyze` is enforced client-side only for UI convenience (hiding the Run/Re-run button); the backend's own guard on `POST /leads/:id/business` remains the sole real enforcement. `leads:read` needs no gate since every role holds it.
- **No new data exposure** — every field rendered comes directly from the two existing endpoints' own response shapes (plus F4's already-reviewed `/leads` endpoints for lead selection); Prompt Hash and a persistent Cache Status are deliberately never shown, since neither is genuinely available.
- **`leadId` comes from the URL, validated only by the backend** — an unknown or unauthorized id returns the backend's real error, rendered as an inline `ErrorState`.
- **Polling cannot amplify AI spend** — `useBusinessAnalysis`'s 3s interval only re-reads the existing row; it never re-triggers an analysis. Re-triggering is a separate, rate-limited (`@Throttle`, 10/60s server-side), user-initiated action.
- **Trigger requests carry no client-supplied payload** — `POST /leads/:id/business` takes no body; there is no field for a client to tamper with to influence which business gets analyzed beyond the `leadId` in the URL path itself, which the backend independently resolves and authorizes.

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application, backend, or AI provider was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1-F5.
- **"Prompt Hash" cannot be displayed** — it exists in the database but is never returned by either endpoint. See DECISIONS.md D-150.
- **"Cache Status" is only ever knowable transiently** — right after triggering, inferred from the response body; a later visit to Analysis Details cannot retroactively show whether the currently-displayed row was originally a hit or a miss. See DECISIONS.md D-151.
- **Analysis History can never show more than one row** — the backend genuinely has no way to retrieve superseded versions, even though `analysisVersion` does increment on every re-run. See DECISIONS.md D-152.
- **"Execution status" on the Dashboard panel is a derived summary sentence** (e.g., "Completed in 4.2s"), not a distinct backend field — built from the real `status`/`executionTimeMs` fields, not fabricated, but worth naming as a presentation choice rather than a literal field name.

## 8. Approval Checklist

- [x] All three Pages and every founder-listed Dashboard/Details/History feature delivered, with hedged fields resolved per their own conditional phrasing — §1, §3
- [x] The one unhedged-but-genuinely-missing field (Prompt Hash) resolved directly by the module's own governing rule, not treated as requiring a fresh approval — §3, DECISIONS.md D-150
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified beyond the one approved additive `NAV_ITEMS` entry and its mechanical test update — §2
- [x] Every request targets one of the two existing Business Analysis endpoints, or F4's already-reviewed Leads endpoints reused directly — no new endpoint, no new permission — §2
- [x] Polling stops on both real terminal statuses, never simulates progress — §1, §6
- [x] DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell reused directly, zero duplicated components — §1, §4
- [x] Real `next build` run, not just typecheck/lint/test — clean, no RSC boundary issue
- [x] Full test suite green (31 new; 225 `apps/admin-web` total)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-149 through D-155) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
