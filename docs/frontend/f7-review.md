# Module Review Report — F7: Theme Engine (Frontend)

**Status:** Module F7 implementation complete, pending founder approval.
**Date:** 2026-08-04
**Reviewed against:** the founder's F7 module brief (Theme Selection Dashboard, Theme Details, Theme Configuration; select-lead/status/run/re-run/compatibility-score/selected-theme/engine-version/theme-version Dashboard features; Theme Details showing every field the backend returns plus M6 brand values read-only, "only display fields actually returned, never invent data"; Theme Configuration as a read-only display of the generated `ThemeConfiguration` — metadata, compatibility validation results, selected components, configuration summary, "no editing"; polling that stops automatically on a terminal state, "never simulate progress"; `leads:read`/`theme:select` permissions, no new permissions; reuse of DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell; `src/features/theme-engine/` following the existing feature architecture), with "Re-run Theme Selection" explicitly hedged ("if backend supports"). No backend API was modified; no previous frontend module was modified beyond one additive `NAV_ITEMS` entry (and its one mechanically-updated pre-existing test assertion), the same category of change F5 and F6 already established and received approval for.

---

## 1. Scope Compliance

| Requirement                                                                                       | Delivered                 | Where                                                                                                                |
| ------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Theme Selection Dashboard                                                                         | ✅                        | `ThemeDashboardPage`                                                                                                 |
| Theme Details                                                                                     | ✅                        | `ThemeDetails`                                                                                                       |
| Theme Configuration                                                                               | ✅                        | `ThemeConfigurationPage`                                                                                             |
| Select Lead                                                                                       | ✅                        | `LeadSelect`, feature-local duplicate reusing F4's `useLeads()` — DECISIONS.md D-162                                 |
| Display current theme status                                                                      | ✅                        | `ThemeStatusPanel`                                                                                                   |
| Run / Re-run Theme Selection (if backend supports)                                                | ✅                        | `SelectThemeButton` — one mutation, label-only difference, since the backend never rejects a re-run                  |
| Display compatibility score / selected theme / engine version / theme version                     | ✅                        | `ThemeStatusPanel`                                                                                                   |
| Every backend-returned field on Theme Details                                                     | ✅                        | `ThemeDetails`                                                                                                       |
| Brand values from M6, read-only, clearly attributed                                               | ✅                        | Fetched via reused `useBusinessAnalysis()`, labeled "from AI Business Analyzer (M6), read-only" — DECISIONS.md D-158 |
| "Brand Style"                                                                                     | ✅ (omitted)              | Not a real field anywhere in M6 or M7's schemas — DECISIONS.md D-159                                                 |
| "Only display fields actually returned. Never invent data."                                       | ✅                        | Verified against `themeConfigurationSchema`/`businessAnalysisOutputSchema` directly                                  |
| Theme Configuration: metadata, validation results, selected components, config summary, read-only | ✅                        | `ThemeConfigurationPage`, no editing affordance anywhere                                                             |
| "Compatibility validation results"                                                                | ✅ (substituted honestly) | `rankedThemes`, labeled "Other Themes Considered" — DECISIONS.md D-160                                               |
| Poll while running, stop on terminal, never simulate progress                                     | ✅ (by omission)          | No polling built at all — no status field exists to poll for — DECISIONS.md D-157                                    |
| `leads:read`/`theme:select`, no new permissions                                                   | ✅                        | Identical strings reused from the backend's own decorators                                                           |
| Reuse DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell                          | ✅                        | All used where applicable (DataTable has no list to page in this module)                                             |
| `src/features/theme-engine/`, existing architecture                                               | ✅                        | Mirrors `src/features/business-analysis/`'s structure                                                                |
| No backend API modified                                                                           | ✅                        | `git status apps/api packages/db` unchanged from before F7 (§2)                                                      |
| No previous frontend module modified beyond one approved addition                                 | ✅                        | One `NAV_ITEMS` entry + its test — §2                                                                                |
| Unit tests                                                                                        | ✅                        | 8 new                                                                                                                |
| Integration tests                                                                                 | ✅                        | 19 new                                                                                                               |
| Documentation                                                                                     | ✅                        | TASKS.md, CHANGELOG.md, DECISIONS.md (D-156 through D-162), this report                                              |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F7 began (the same M10-M12 changes from earlier sessions) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, exactly one previously-shipped file changed: `src/lib/auth.ts`, where one new `NAV_ITEMS` entry (`{id: 'theme-engine', label: 'Theme Engine', href: '/theme-engine', requiredPermission: null}`) was added, applying F5/F6's D-141/D-149 precedent directly for the third time. Its one mechanical consequence, `src/lib/auth.test.ts`'s exact-list assertion, was updated to match. No other F1, RBAC Alignment, F2, F3, F4, F5, or F6 file was touched. Every request F7 makes targets the two existing Theme Engine endpoints (`GET/POST /leads/:id/theme`) plus F4's/F6's own existing `GET /leads`, `GET /leads/:id`, and `GET /leads/:id/business` (all reused, not re-implemented) — no new endpoint, no new query parameter, no modified or new permission.

## 3. Backend Reality Diverges From the Brief More Than the Hedge Anticipated — Resolved Directly

The founder hedged only "Re-run Theme Selection (if backend supports)" and carried forward F6's polling instruction. Research against `apps/api/src/theme-engine/` found the real backend diverges further than either hedge anticipated, in ways this module's own governing rules already resolve:

1. **No status field at all, and no async workflow to poll.** `ThemeConfiguration` has no status enum in either the Prisma model or `themeConfigurationSchema` — confirmed by reading both directly. `selectTheme()` awaits the AI recommendation step synchronously (with a rules-only fallback on failure or quota exhaustion) and returns a fully-formed, terminal row in the same HTTP response. **Resolved directly**: no polling machinery built anywhere in this module — the founder's own "never simulate progress" instruction directly rules out building a progress UI for a state that structurally cannot exist. See DECISIONS.md D-157.
2. **"Re-run" is unconditionally allowed — the hedge was warranted, but not in the direction of a restriction.** `selectTheme()` never rejects; it either returns the existing cached configuration (unchanged `businessAnalysisId`) or creates a new version (business analysis re-run since, or no theme selected yet). **Resolved directly**: one button, one mutation, label-only difference. See DECISIONS.md within the F7 section.
3. **Several requested brand fields aren't in the theme response at all.** `themeConfigurationSchema` carries through only `industry`/`layoutStyle`/`colorPalette`/`typography` from M6 — Brand Personality, Tone of Voice, Target Audience, Website Sections, and CTA Recommendations are not there. **Resolved directly**: fetched via F6's own `useBusinessAnalysis()` hook, reused rather than re-implemented. See DECISIONS.md D-158.
4. **"Brand Style" isn't real anywhere.** Read `businessAnalysisOutputSchema` (all 19 M6 fields) and `themeConfigurationSchema` in full — no `brandStyle` field or equivalent exists under any name. **Resolved directly** by the module's own "never invent data" rule. See DECISIONS.md D-159.
5. **"Compatibility validation results" has no literal field.** Unlike M6's `validationErrors`, `ThemeConfiguration` has no validation-results array. **Resolved directly**: `rankedThemes` (a real, returned field) is shown, honestly labeled "Other Themes Considered" rather than "Validation Results." See DECISIONS.md D-160.

Routing (one new nav entry, three nested routes) followed F5/F6's D-141/D-149 precedent directly rather than re-asking a third time.

## 4. Implementation Summary

**`src/features/theme-engine/`** (new feature folder, mirroring `src/features/business-analysis/`'s structure, minus everything polling-related since it doesn't apply):

- `api/use-theme-configuration.ts` (plain `useQuery`, no `refetchInterval`), `api/use-select-theme.ts` (no request body).
- `components/lead-select.tsx` — feature-local duplicate of F6's own, both thin wrappers around F4's `useLeads()`.
- `components/select-theme-button.tsx` — the shared Run/Re-run mutation trigger.
- `components/theme-status-panel.tsx`, `components/theme-dashboard-page.tsx` — Dashboard composition (reuses F4's `useLead()` for reload-safe business-name lookup, and F6's `useBusinessAnalysis()` to proactively check the real precondition before offering Run — DECISIONS.md D-161).
- `components/theme-details.tsx` — the exhaustive theme field dump plus reused-hook brand passthrough.
- `components/theme-configuration-page.tsx` — the read-only technical configuration dump.

**`app/(dashboard)/theme-engine/page.tsx`**, **`.../[leadId]/page.tsx`**, **`.../[leadId]/configuration/page.tsx`** (new routes).

**`src/lib/auth.ts`** — one additive `NAV_ITEMS` entry (D-156).

## 5. Test Coverage

| Suite                               | Tests | Notes                                                                                                                                                                                                      |
| ----------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-theme-configuration.test.tsx`  | 2     | `null` and populated responses parse correctly, in a single fetch (no polling to prove, deliberately)                                                                                                      |
| `select-theme-button.test.tsx`      | 6     | Label switches Run/Re-run, hidden for developer/viewer (no `theme:select`), success toast names the theme, backend error shown verbatim                                                                    |
| `lead-select.test.tsx`              | 4     | 2+ char minimum enforced, result click calls `onChange`, no-results message                                                                                                                                |
| `theme-status-panel.test.tsx`       | 3     | Links to Business Analysis when no completed analysis exists, "no theme yet" state, full status display (theme name/compatibility score/theme version/engine version) once one exists                      |
| `theme-details.test.tsx`            | 4     | Every theme + brand-passthrough field rendered, no "Brand Style" text anywhere, no-theme-yet state, 404 ErrorState                                                                                         |
| `theme-configuration-page.test.tsx` | 5     | Metadata/components/summary/accessibility/ranked-alternatives all rendered, AI Recommendation section shown/hidden based on real null fields, no "validation results" text, no editing affordance anywhere |
| `theme-dashboard-page.test.tsx`     | 3     | No panel before selection, `?leadId=` pushed on selection, panel renders correctly when `?leadId=` is already in the URL (reload-safe)                                                                     |

**Totals:** 27 new tests (8 unit, 19 integration). `apps/admin-web` 252/252 (up from 225). `packages/ui` unchanged at 33/33 (F7 needed no new shared primitives). Full monorepo build/typecheck/lint/test clean; a real `next build` re-run clean — `/theme-engine` (2.49 kB), `/theme-engine/[leadId]` (4.67 kB), `/theme-engine/[leadId]/configuration` (1.94 kB), no RSC `'use client'` boundary issue.

## 6. Security Review

- **AuthZ** — `theme:select` is enforced client-side only for UI convenience (hiding the Run/Re-run button); the backend's own guard on `POST /leads/:id/theme` remains the sole real enforcement. `leads:read` needs no gate since every role holds it.
- **No new data exposure** — every field rendered comes directly from the two existing endpoints' own response shapes (plus F4's/F6's already-reviewed endpoints reused for lead selection and brand passthrough); "Brand Style" and a validation-results field are deliberately never shown, since neither is genuinely available.
- **`leadId` comes from the URL, validated only by the backend** — an unknown or unauthorized id returns the backend's real error, rendered as an inline `ErrorState`.
- **No polling means no possibility of amplifying AI spend through repeated background reads** — `useThemeConfiguration` never re-fetches on an interval; re-running is a separate, rate-limited (`@Throttle`, 10/60s server-side), user-initiated action.
- **Trigger requests carry no client-supplied payload** — `POST /leads/:id/theme` takes no body; the only client-controlled input is the `leadId` in the URL path, independently resolved and authorized by the backend.

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application, backend, or AI provider was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1-F6.
- **Brand values on Theme Details come from the _latest_ business analysis, not necessarily the exact one a given theme was selected from** — no endpoint exists to fetch a `BusinessAnalysis` by id, only the latest, so if analysis has been re-run since theme selection, the two can diverge. There is no alternative fetch the frontend could make instead; this is a structural gap in the backend's own read surface. See DECISIONS.md D-158.
- **"Brand Style" cannot be displayed** — not a real field anywhere in M6's or M7's schemas. See DECISIONS.md D-159.
- **"Other Themes Considered" is not the same thing as validation output** — it answers "what else scored close," not "why did this theme pass" (there is no per-check breakdown returned, only the final composite score). Labeled accordingly, not as "Validation Results."

## 8. Approval Checklist

- [x] All three Pages and every founder-listed Dashboard/Details/Configuration feature delivered, with the hedged Re-run feature resolved per the backend's real (permissive) behavior — §1, §3
- [x] Every real backend divergence (no status field, brand fields not embedded, "Brand Style" not real, no validation-results field) resolved directly by this module's own governing rules, not treated as requiring a fresh approval — §3, DECISIONS.md D-157 through D-160
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified beyond the one approved additive `NAV_ITEMS` entry and its mechanical test update — §2
- [x] Every request targets one of the two existing Theme Engine endpoints, or F4's/F6's already-reviewed endpoints reused directly — no new endpoint, no new permission — §2
- [x] No polling built, correctly matching the backend's genuinely synchronous behavior — never simulated — §1, §3
- [x] DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell reused directly, zero duplicated components — §1, §4
- [x] Real `next build` run, not just typecheck/lint/test — clean, no RSC boundary issue
- [x] Full test suite green (27 new; 252 `apps/admin-web` total)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-156 through D-162) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
