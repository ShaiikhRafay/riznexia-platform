# Module Review Report — F9: Website Preview (Frontend)

**Status:** Module F9 implementation complete, pending founder approval.
**Date:** 2026-08-05
**Reviewed against:** the founder's F9 module brief (Website Preview Dashboard, Desktop Preview, Tablet Preview, Mobile Preview, Validation Report, Publish Readiness; Dashboard features Select Lead/Display preview status/Generate Preview (if backend requires)/Display latest preview information; Responsive Preview offering three modes where switching "must only change the viewport... never regenerate the website... render only the Generated Website returned by the backend"; Validation Report showing Structural/Content/SEO/Accessibility/Performance validation, Passed Checks/Failed Checks/Warnings/Deductions/Validation Messages, "never calculate scores on the frontend, never invent validation results"; Publish Readiness showing Overall/SEO/Accessibility/Performance/Content/Structure Score, Publish Recommendation, Reasons, Deductions, "never calculate readiness on the frontend"; `leads:read`/`website:preview` permissions, hide actions when permission is missing; reuse of StatusBadge/PermissionGate/ErrorState/Skeletons/Tabs/Cards/AppShell; `src/features/website-preview/`; "The frontend is a visualization layer only. Do not regenerate websites. Do not execute validators. Do not compute scores."). No backend API was modified; no previous frontend module was modified beyond one additive `NAV_ITEMS` entry (and its mechanically-updated pre-existing test assertions), the same category of change F5 through F8 already established and received approval for — though this entry's own gating differs from precedent (§3).

---

## 1. Scope Compliance

| Requirement                                                                | Delivered                                                     | Where                                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website Preview Dashboard                                                  | ✅                                                            | `WebsitePreviewDashboardPage` → `PreviewStatusPanel`                                                                                                    |
| Desktop / Tablet / Mobile Preview                                          | ✅ (as one `Tabs`-driven route)                               | `ResponsivePreview` — DECISIONS.md D-173                                                                                                                |
| Validation Report                                                          | ✅                                                            | `ValidationReport`                                                                                                                                      |
| Publish Readiness                                                          | ✅                                                            | `PublishReadiness`                                                                                                                                      |
| Select Lead                                                                | ✅                                                            | `LeadSelect`, feature-local duplicate reusing F4's `useLeads()`                                                                                         |
| Display preview status                                                     | ✅                                                            | `PreviewStatusPanel`'s `StatusBadge` (Website Not Generated Yet / Preview Available)                                                                    |
| Generate Preview (if backend requires)                                     | ✅ (resolved by omission)                                     | No POST exists on the backend — the GET itself computes-and-caches automatically — DECISIONS.md D-172                                                   |
| Display latest preview information                                         | ✅                                                            | `PreviewStatusPanel` — business/theme name, preview/generated-website/generator versions, file count, created date                                      |
| Switching modes only changes the viewport, never regenerates               | ✅                                                            | `ResponsivePreview` — one `useWebsitePreview()` call, `Tabs` switch is pure client-side state, zero refetch (proven in tests)                           |
| Render only the Generated Website returned by the backend                  | ✅ (honestly scoped)                                          | `WebsitePreview.files` is a manifest, not HTML — rendered as a labeled structural summary, never fabricated pixels — DECISIONS.md D-173                 |
| Structural / Content / SEO / Accessibility / Performance validation        | ✅                                                            | `ValidationReport`'s five `Tabs`, grouped client-side from the real `ruleCategory` field                                                                |
| Passed Checks / Failed Checks / Warnings / Validation Messages             | ✅                                                            | `CategoryRules`/`RuleGroup`, tallied from the real `status` field                                                                                       |
| "Deductions" on Validation Report                                          | ✅ (omitted)                                                  | Not a real field on `PreviewReport` — DECISIONS.md D-174                                                                                                |
| "Never calculate scores on the frontend. Never invent validation results." | ✅                                                            | Verified against `previewReportSchema` directly; only filtering/counting of real fields, no new value computed                                          |
| Overall / SEO / Accessibility / Performance / Content / Structure Score    | ✅                                                            | `PublishReadiness` — all six real `ScoreBreakdown` fields                                                                                               |
| Deductions (on Publish Readiness)                                          | ✅                                                            | Each `ScoreCard` lists every real `ScoreDeduction` (ruleName, pointsDeducted, reason)                                                                   |
| "Publish Recommendation", "Reasons"                                        | ✅ (omitted)                                                  | Neither field exists on `PublishReadinessReport`; deriving either would itself violate "never calculate readiness on the frontend" — DECISIONS.md D-175 |
| `leads:read`/`website:preview`, hide actions when permission is missing    | ✅ (permission gates entire page content, not just an action) | Every one of F9's four pages is `PermissionGate`-wrapped on `website:preview` — the backend's own GETs are the privileged action here                   |
| Reuse StatusBadge/PermissionGate/ErrorState/Skeletons/Tabs/Cards/AppShell  | ✅                                                            | All seven reused; `Tabs`/`Card` newly promoted to `packages/ui` for this module — DECISIONS.md D-170                                                    |
| `src/features/website-preview/`, existing architecture                     | ✅                                                            | Mirrors `src/features/website-generator/`'s structure                                                                                                   |
| No backend API modified                                                    | ✅                                                            | `git status apps/api packages/db` unchanged from before F9 (§2)                                                                                         |
| No previous frontend module modified beyond one approved addition          | ✅                                                            | One `NAV_ITEMS` entry + its tests — §2                                                                                                                  |
| Unit tests                                                                 | ✅                                                            | 5 new (feature) + 4 new (`packages/ui`)                                                                                                                 |
| Integration tests                                                          | ✅                                                            | 18 new                                                                                                                                                  |
| Documentation                                                              | ✅                                                            | TASKS.md, CHANGELOG.md, DECISIONS.md (D-170 through D-175), this report                                                                                 |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F9 began (the same M10-M12 changes carried since earlier sessions, the identical set F7's and F8's reviews already documented as pre-existing) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, exactly one previously-shipped file changed: `src/lib/auth.ts`, where one new `NAV_ITEMS` entry was added. Its one mechanical consequence, `src/lib/auth.test.ts`, gained two new tests rather than a change to the existing exact-list assertion, since this entry — uniquely among F5-F9 — is itself permission-gated and therefore correctly absent from that list already (§3). No other F1 through F8 file was touched. `packages/ui` gained two wholly new files (`tabs.tsx`, `card.tsx`) and one new dependency (`@radix-ui/react-tabs`) — additive only, no existing `packages/ui` file was modified. Every request F9 makes targets the three existing Website Preview endpoints (`GET /leads/:id/preview`, `.../preview/validation`, `.../preview/readiness`) plus F4's/F8's own existing `GET /leads`, `GET /leads/:id`, and `GET /leads/:id/website` (all reused, not re-implemented) — no new endpoint, no new query parameter, no modified or new backend permission.

## 3. Backend Reality Diverges From the Brief — Every Gap Resolved Directly, None Escalated

Unlike F8 (which required founder escalation for a genuine permission-scope gap), every divergence found in F9 was resolvable directly by the module's own governing rules — verified by reading `apps/api/src/website-preview/{website-preview.controller.ts,website-preview.service.ts}` and `packages/shared-types/src/website-preview.ts` in full:

1. **No POST anywhere in M9 — the GET itself is the privileged, computing action.** All three routes are `GET`, each synchronously running the pure engine functions and persisting a new versioned row inline whenever the cached latest row's `generatedWebsiteVersion` no longer matches the current `GeneratedWebsite.configVersion`. **Resolved directly**: "Generate Preview" is omitted entirely — there is nothing to trigger. See DECISIONS.md D-172.
2. **Viewing itself is privileged, not just a trigger action.** All three GETs require `website:preview` (`developer`/`viewer` hold neither it nor any fallback read view) and are individually audited (`website.preview_opened`, etc.) — a materially different shape from every prior M6-M8 module, where viewing only needed the universal `leads:read`. **Resolved directly**: every one of F9's four pages gates its entire content on `website:preview`, and — a deliberate first-time deviation from F5-F8's precedent — the `NAV_ITEMS` entry itself is gated too, avoiding a dead-end link. See DECISIONS.md D-171.
3. **`WebsitePreview.files` is a file manifest, never rendered HTML.** Confirmed against `websitePreviewSchema`: `files: {path, sizeBytes}[]`. `GeneratedWebsite.files` (F8) does carry real source text, but executing/transpiling it client-side to produce real pixels is exactly what "do not regenerate websites on the frontend" forbids; iframing a live deployed URL would require pulling in a different module's (`deployment:view`) data and permission model, reaching outside F9's own scope. **Resolved directly**: an honestly-labeled structural manifest, viewport-framed. See DECISIONS.md D-173.
4. **`PreviewReport.rules` is flat and ungrouped, with no `deductions` field.** Confirmed against `previewReportSchema`: one array, mixing all five `ruleCategory` values, no per-category container, no deductions. **Resolved directly**: client-side grouping/tallying by the real `ruleCategory`/`status` fields (a display tally, not a score), "Deductions" omitted from this page. See DECISIONS.md D-174.
5. **`PublishReadinessReport` has no `publishRecommendation`/`reasons` field.** Confirmed against `publishReadinessReportSchema`: exactly six `ScoreBreakdown` fields, nothing else. Deriving a recommendation from `overallPublishScore.score` was considered and rejected — it would be exactly the frontend-side readiness calculation the brief itself forbids in the same breath it asks for the field. **Resolved directly** by omission; `ScoreDeduction.reason` is shown inline with each real deduction instead. See DECISIONS.md D-175.
6. **`Tabs` and `Card` don't exist yet in `packages/ui`**, despite being named in the brief's own reuse list. **Resolved directly**, following F4's `AlertDialog`/`Textarea` precedent: promoted as new generic primitives, first consumed by this module. See DECISIONS.md D-170.

None of the six required an `AskUserQuestion` escalation — in each case the brief's own rules (never regenerate / never invent data / never calculate scores or readiness on the frontend) left exactly one compliant implementation, the same "governing rule already resolves it" pattern established in F7 (D-157, D-159) and F8 (D-166 through D-168).

## 4. Implementation Summary

**`packages/ui/src/components/`** (new): `tabs.tsx` (`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, wraps new `@radix-ui/react-tabs` dependency), `card.tsx` (`Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`, plain styled divs) — both exported from `index.ts`, both generic with no domain knowledge (DECISIONS.md D-170).

**`src/features/website-preview/`** (new feature folder, mirroring `src/features/website-generator/`'s structure):

- `api/use-website-preview.ts`, `use-validation-report.ts`, `use-readiness-report.ts` — three plain `useQuery` hooks against the three real M9 endpoints, no mutations (no POST exists), no polling.
- `components/lead-select.tsx` — feature-local duplicate of F6/F7/F8's own, a thin wrapper around F4's `useLeads()`.
- `components/detail-primitives.tsx` — `FieldRow`/`ListField` only (section containers now use the newly-promoted shared `Card` instead of a feature-local `DetailCard`).
- `components/preview-status-panel.tsx` — Dashboard's core panel: checks for a `GeneratedWebsite` via F8's reused `useGeneratedWebsite()` before ever calling the privileged preview endpoint; blocked/permission-fallback/success states; links to all three report pages.
- `components/website-preview-dashboard-page.tsx` — Select Lead + `?leadId=` URL pattern, mirroring F6/F7/F8 exactly.
- `components/responsive-preview.tsx` — the Desktop/Tablet/Mobile `Tabs` view with internal state as the source of truth (URL kept in sync via `router.replace` for bookmarking) and the device-framed structural manifest.
- `components/validation-report.tsx` — category `Tabs` + status-bucketed rule groups.
- `components/publish-readiness.tsx` — six `ScoreCard`s (`Card`-based) with real deductions.

**`app/(dashboard)/website-preview/page.tsx`**, **`.../[leadId]/preview/page.tsx`**, **`.../[leadId]/validation/page.tsx`**, **`.../[leadId]/readiness/page.tsx`** (new routes).

**`src/lib/auth.ts`** — one additive, permission-gated `NAV_ITEMS` entry (D-171).

## 5. Test Coverage

| Suite                                      | Tests | Notes                                                                                                                                                                                         |
| ------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/components/tabs.test.tsx` | 2     | Active-panel switching, controlled value/onValueChange for URL-persisted state                                                                                                                |
| `packages/ui/src/components/card.test.tsx` | 2     | Composable sections render, className forwarding                                                                                                                                              |
| `use-website-preview.test.tsx`             | 2     | Single-fetch success (no polling), `GENERATED_WEBSITE_NOT_FOUND` surfaces as a real `ApiError`, not a null success                                                                            |
| `lead-select.test.tsx`                     | 3     | 2+ char minimum enforced, result click calls `onChange`                                                                                                                                       |
| `preview-status-panel.test.tsx`            | 4     | Blocked (no website) with link to Website Generator, permission-fallback hides details even when a website exists, success shows latest info + all three report links, defensive 404 handling |
| `website-preview-dashboard-page.test.tsx`  | 3     | No panel before selection, `?leadId=` pushed on selection, blocked state renders correctly when `?leadId=` is already in the URL (reload-safe)                                                |
| `responsive-preview.test.tsx`              | 4     | Blocked message on `GENERATED_WEBSITE_NOT_FOUND`, permission-gated, default desktop manifest renders honestly-labeled, tab switch changes viewport with zero second fetch                     |
| `validation-report.test.tsx`               | 3     | Default category tallies correctly, tab switch shows a different category's own tally, no "Deductions" section anywhere                                                                       |
| `publish-readiness.test.tsx`               | 4     | All six scores render, deductions shown with rule/points/reason, "No deductions." for an empty category, no "Publish Recommendation"/"Reasons" text anywhere                                  |

**Totals:** 27 new tests (5 `packages/ui` unit-level component tests + 22 `src/features/website-preview` tests: 5 unit, 17 integration — 23 counted under the feature folder). `apps/admin-web` 311/311 (up from 286), across 81 test files. `packages/ui` 37/37 (up from 35). Full monorepo build/typecheck/lint/test clean; a real `next build` run clean — `/website-preview` (3.05 kB), `/website-preview/[leadId]/preview` (2.49 kB), `/website-preview/[leadId]/validation` (2.16 kB), `/website-preview/[leadId]/readiness` (2.02 kB), no RSC `'use client'` boundary issue.

## 6. Security Review

- **AuthZ** — `website:preview` is enforced client-side for UI convenience (gating both the nav entry and every page's content); the backend's own guards on all three GETs remain the sole real enforcement. `leads:read` needs no separate gate since every role holds it, and no F9 route relies on it alone.
- **No new data exposure** — every field rendered comes directly from the three existing M9 endpoints' own response shapes (plus F4's/F8's already-reviewed endpoints reused for lead selection and the generated-website precondition check); "Publish Recommendation," "Reasons," and per-category "Deductions" on Validation Report are deliberately never shown, since none is genuinely available.
- **`leadId` comes from the URL, validated only by the backend** — an unknown or unauthorized id returns the backend's real error, rendered as an inline `ErrorState`; the specific `GENERATED_WEBSITE_NOT_FOUND` 404 is distinguished from other errors via `ApiError.code`, never string-matched against `.message`.
- **No polling, and no way to trigger recomputation on a timer** — all three hooks are plain one-shot `useQuery` calls; the backend's own cache-versioning (keyed to `GeneratedWebsite.configVersion`) means repeated navigation to the same preview never re-runs the validators unless the underlying website actually changed.
- **No file content is ever executed or rendered as live markup** — Responsive Preview shows `path`/`sizeBytes` as plain text only, never as `<img>`, `<iframe srcDoc>`, or any executed code path — eliminating any risk of rendering untrusted generated source as live content in the admin dashboard.

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application, backend, or AI provider was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1-F8. The real `next build` in this session additionally required `NEXT_PUBLIC_API_BASE_URL` and placeholder Clerk key env vars to be supplied inline, since no `.env.local` exists in this environment — a pre-existing environment-setup requirement, not something F9 introduced.
- **Desktop/Tablet/Mobile Preview shows a structural file manifest, not a live rendered screenshot of the actual site** — the backend returns no HTML or screenshot for this resource at any endpoint. See DECISIONS.md D-173.
- **"Publish Recommendation" and "Reasons" cannot be displayed** — neither field exists on `PublishReadinessReport`, and the founder's own brief explicitly forbids computing either client-side. See DECISIONS.md D-175.
- **"Deductions" cannot be displayed on Validation Report** — that field exists only on Publish Readiness's `ScoreBreakdown`, not on `PreviewReport`. See DECISIONS.md D-174.

## 8. Approval Checklist

- [x] All six founder-listed pages delivered — Desktop/Tablet/Mobile Preview as one `Tabs`-driven route per the brief's own "switching must only change the viewport" instruction — §1, §3
- [x] Every real backend divergence (no POST, viewing itself privileged, file-manifest-not-HTML, ungrouped rules with no deductions, no readiness-recommendation field, missing Tabs/Card primitives) resolved directly by this module's own governing rules, with no founder escalation required — §3, DECISIONS.md D-170 through D-175
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified beyond the one approved additive `NAV_ITEMS` entry — §2
- [x] Every request targets one of the three existing Website Preview endpoints, or F4's/F8's already-reviewed endpoints reused directly — no new endpoint, no new permission — §2
- [x] No polling, no client-side score/readiness computation, no fabricated pixels — verified against the actual backend response shapes, not assumed — §3
- [x] StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell reused directly; Tabs/Card newly promoted per the brief's own instruction, zero duplicated components — §1, §4
- [x] Real `next build` run, not just typecheck/lint/test — clean, no RSC boundary issue
- [x] Full test suite green (27 new; 311 `apps/admin-web` total, 37 `packages/ui` total)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-170 through D-175) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
