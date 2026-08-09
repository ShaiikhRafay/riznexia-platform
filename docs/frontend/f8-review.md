# Module Review Report — F8: Website Generator (Frontend)

**Status:** Module F8 implementation complete, pending founder approval.
**Date:** 2026-08-04
**Reviewed against:** the founder's F8 module brief (Website Generator Dashboard, Layout Viewer, Component Viewer, Content Viewer, Generated Website Overview; Dashboard features Select Lead/Display generation status/Generate Website/Display generated version/Display generator version; Layout Viewer showing Layout Structure/Sections/Order/Hierarchy/Layout Metadata, read-only, never modify layout; Component Viewer showing Component Name/Type/Configuration/Properties/Metadata for every component, read-only, no editable components; Content Viewer showing Text Content/CTA Content/SEO Content/Images (references only)/Source Information/Content Metadata exactly as returned, never regenerate, never rewrite; Generated Website Overview showing Website Version/Generator Version/Created Date/Generated Files Summary/Theme Used/Business Analysis Version/Theme Configuration Version, only backend-returned fields, never invent data; `leads:read`/`website:assemble` permissions, hide actions when permission is missing; reuse of DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell; `src/features/website-generator/`; "The frontend is only a visualization layer. Do not regenerate websites on the frontend."). No backend API was modified; no previous frontend module was modified beyond one additive `NAV_ITEMS` entry (and its one mechanically-updated pre-existing test assertion), the same category of change F5, F6, and F7 already established and received approval for.

---

## 1. Scope Compliance

| Requirement                                                                                                                                         | Delivered                                  | Where                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Website Generator Dashboard                                                                                                                         | ✅                                         | `WebsiteGeneratorDashboardPage` → `WebsitePipelinePanel`                           |
| Layout Viewer                                                                                                                                       | ✅                                         | `LayoutViewer`                                                                     |
| Component Viewer                                                                                                                                    | ✅                                         | `ComponentViewer`                                                                  |
| Content Viewer                                                                                                                                      | ✅                                         | `ContentViewer`                                                                    |
| Generated Website Overview                                                                                                                          | ✅                                         | `GeneratedWebsiteOverview`                                                         |
| Select Lead                                                                                                                                         | ✅                                         | `LeadSelect`, feature-local duplicate reusing F4's `useLeads()`                    |
| Display generation status                                                                                                                           | ✅                                         | `PipelineStageCard`'s `StatusBadge` per stage                                      |
| Generate Website                                                                                                                                    | ✅ (as 4 real stages, not 1 button)        | `WebsitePipelinePanel` — DECISIONS.md D-164                                        |
| Display generated version / generator version                                                                                                       | ✅                                         | `GeneratedWebsiteOverview`                                                         |
| Layout Structure / Sections / Order / Hierarchy / Layout Metadata                                                                                   | ✅                                         | `LayoutViewer`                                                                     |
| Layout: read-only, never modify                                                                                                                     | ✅                                         | No mutation call anywhere on the page                                              |
| Component Name / Type / Configuration / Properties / Metadata, every component                                                                      | ✅                                         | `ComponentViewer` — "Component Name" = `componentId`, DECISIONS.md D-166           |
| Component Viewer: read-only, no editable components                                                                                                 | ✅                                         | No input/save affordance anywhere                                                  |
| Text Content / CTA Content / SEO Content / Images (references only) / Source Information / Content Metadata                                         | ✅                                         | `ContentViewer` — Text+CTA combined as "Bound Content," DECISIONS.md D-167         |
| Content Viewer: never regenerate, never rewrite                                                                                                     | ✅                                         | Purely a display of `ContentManifest.componentContent` as returned                 |
| Website Version / Generator Version / Created Date / Generated Files Summary / Theme Used / Business Analysis Version / Theme Configuration Version | ✅                                         | `GeneratedWebsiteOverview` — last three via reused F6/F7 hooks, DECISIONS.md D-169 |
| "Only display fields returned by the backend. Never invent data."                                                                                   | ✅                                         | Verified against all four schemas directly                                         |
| `leads:read`/`website:assemble`, hide actions when missing                                                                                          | ✅ (expanded to the real 4-permission set) | DECISIONS.md D-164; every `PipelineStageCard` action is `PermissionGate`-wrapped   |
| Reuse DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell                                                                            | ✅                                         | DataTable in Component/Content viewers, all others used throughout                 |
| `src/features/website-generator/`, existing architecture                                                                                            | ✅                                         | Mirrors `src/features/theme-engine/`'s structure                                   |
| No backend API modified                                                                                                                             | ✅                                         | `git status apps/api packages/db` unchanged from before F8 (§2)                    |
| No previous frontend module modified beyond one approved addition                                                                                   | ✅                                         | One `NAV_ITEMS` entry + its test — §2                                              |
| Unit tests                                                                                                                                          | ✅                                         | 7 new                                                                              |
| Integration tests                                                                                                                                   | ✅                                         | 27 new                                                                             |
| Documentation                                                                                                                                       | ✅                                         | TASKS.md, CHANGELOG.md, DECISIONS.md (D-163 through D-169), this report            |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F8 began (the same M10-M12 changes carried since earlier sessions, the identical set F7's review already documented as pre-existing) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, exactly one previously-shipped file changed: `src/lib/auth.ts`, where one new `NAV_ITEMS` entry (`{id: 'website-generator', label: 'Website Generator', href: '/website-generator', requiredPermission: null}`) was added, applying F5/F6/F7's D-141/D-149/D-156 precedent directly for the fourth time. Its one mechanical consequence, `src/lib/auth.test.ts`'s exact-list assertion, was updated to match. No other F1 through F7 file was touched. Every request F8 makes targets the eight existing M8.x endpoints (`GET/POST /leads/:id/layout`, `.../components`, `.../content`, `.../website`) plus F4's/F6's/F7's own existing `GET /leads`, `GET /leads/:id`, `GET /leads/:id/business`, and `GET /leads/:id/theme` (all reused, not re-implemented) — no new endpoint, no new query parameter, no modified or new permission.

## 3. Backend Reality Diverges From the Brief — The Pipeline Dependency Chain

The founder's brief scoped F8's permissions to `leads:read`/`website:assemble` only, with a single "Generate Website" Dashboard feature. Research against `apps/api/src/{layout-engine,component-engine,content-engine,website-assembly}/` — reading all four `*.service.ts` files in full — found the real backend has a strict, unbreakable sequential dependency chain with **zero cross-module orchestration code anywhere**:

1. `LayoutEngineService.generateLayout()` requires an existing `ThemeConfiguration` — throws `ThemeConfigurationNotFoundException` immediately if none exists.
2. `ComponentEngineService.generateComponents()` requires an existing `LayoutConfiguration` — throws `LayoutConfigurationNotFoundException` immediately if none exists.
3. `ContentEngineService.bindContent()` requires an existing `ComponentManifest` — throws `ComponentManifestNotFoundException` immediately if none exists.
4. `WebsiteAssemblyService.assembleWebsite()` requires an existing `ContentManifest` — throws `ContentManifestNotFoundException` immediately if none exists.

Nothing in `app.module.ts` or any service wires these stages together automatically — each `POST` is independently gated on its own single predecessor, full stop. Implementing the brief literally (`leads:read`/`website:assemble` only, one "Generate Website" button) would have shipped a Dashboard whose primary action 404s immediately for virtually every lead's first pass, since Content (and therefore Component, and therefore Layout) essentially never already exists on a lead that hasn't been through this exact pipeline before.

This is a material, functionality-breaking discovery — not a routine field-mapping gap — so it was surfaced directly via `AskUserQuestion` rather than resolved unilaterally, the same escalation threshold used for F4's Contact Info gap and F5's Resume non-existence. Two concrete resolutions were framed:

- Keep the brief literal: one "Generate Website" button gated on `website:assemble` alone, which fails immediately unless the lead happens to already have gone through Layout/Component/Content some other way (there is no other way).
- **(Selected)** Show all four pipeline stages with their own real status and real permission-gated action: Layout (`layout:generate`), Components (`component:generate`), Content (`content:bind`), Website (`website:assemble`) — each `PipelineStageCard` chained to its own real predecessor's existence (`blockedReason` set to e.g. "Requires Layout first" when the prior stage's GET returns null), matching the backend's actual mechanics instead of hiding them behind one button that silently fails.

The founder approved the second option. See DECISIONS.md D-164 for the full resolution text. Four further minor field-mapping gaps (D-166 through D-169) were resolved directly, without escalation, following this session's established discipline of reserving `AskUserQuestion` for discoveries that would otherwise silently break shipped functionality:

- **"Component Name" has no backing field** — `ComponentDefinition` has no separate display-name field; `componentId` is the only real identifier. Mapped directly, the same category of resolution as F5's history columns mapping founder-friendly labels ("Imported"/"Updated"/"Failed") onto the real fields that answer them (`businessesCreated`/`businessesUpdated`/`businessesFailed`), not an invented field. See D-166.
- **"Text Content" vs "CTA Content" has no structural distinction** — `ContentManifest.componentContent`'s `kind` field is `text | image | icon | link | list`, never a CTA flag; nothing in the schema marks a binding as call-to-action versus plain text. Shown together, honestly labeled "Bound Content," rather than guessing a CTA classification from `componentId`/`slotName` string patterns the backend itself doesn't make. See D-167.
- **"Generated Files Summary" has no backing field** — computed purely client-side (`files.length`, `files.map(f => f.path)`) from the already-fully-returned `files` array on `GeneratedWebsite`; justified as pure display arithmetic against the founder's own "the frontend is only a visualization layer" instruction, not regeneration. See D-168.
- **"Theme Used"/"Business Analysis Version"/"Theme Configuration Version" have no backing fields on `GeneratedWebsite`** — only raw foreign-key ids (`themeConfigurationId`, `businessAnalysisId`). Resolved by reusing F6's `useBusinessAnalysis` and F7's `useThemeConfiguration` hooks directly, the same cross-feature hook-layer reuse convention already established twice before in this session. See D-169.

Routing (one new nav entry, five nested routes) followed F5/F6/F7's D-141/D-149/D-156 precedent directly rather than re-asking a fourth time. See DECISIONS.md D-163.

## 4. Implementation Summary

**`src/features/website-generator/`** (new feature folder, mirroring `src/features/theme-engine/`'s structure):

- `api/use-layout-configuration.ts`, `use-component-manifest.ts`, `use-content-manifest.ts`, `use-generated-website.ts` (plain `useQuery`, no `refetchInterval` — all four M8.x resources are synchronous and deterministic, DECISIONS.md D-165).
- `api/use-generate-layout.ts`, `use-generate-components.ts`, `use-bind-content.ts`, `use-assemble-website.ts` (POST mutations, no request body, `setQueryData`+`invalidateQueries` on success).
- `components/lead-select.tsx` — feature-local duplicate of F6's/F7's own, a thin wrapper around F4's `useLeads()`.
- `components/detail-primitives.tsx` — `DetailCard`/`FieldRow`/`ListField`, shared across this feature's five pages.
- `components/pipeline-stage-card.tsx` — the core Dashboard building block: status badge, permission-gated Generate/Re-generate action, or a plain blocked-reason message when its real predecessor is missing.
- `components/website-pipeline-panel.tsx` — composes the Theme precondition (reuses F7's `useThemeConfiguration`) and all four `PipelineStageCard`s in dependency order.
- `components/website-generator-dashboard-page.tsx` — Select Lead + `?leadId=` URL pattern, mirroring F7 exactly, reuses F4's `useLead()`.
- `components/layout-viewer.tsx`, `component-viewer.tsx`, `content-viewer.tsx`, `generated-website-overview.tsx` — the four read-only viewer pages.

**`app/(dashboard)/website-generator/page.tsx`**, **`.../[leadId]/page.tsx`**, **`.../[leadId]/layout/page.tsx`**, **`.../[leadId]/components/page.tsx`**, **`.../[leadId]/content/page.tsx`** (new routes).

**`src/lib/auth.ts`** — one additive `NAV_ITEMS` entry (D-163).

## 5. Test Coverage

| Suite                                       | Tests | Notes                                                                                                                                                                   |
| ------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-layout-configuration.test.tsx`         | 2     | `null` and populated responses parse correctly, single fetch, no polling to prove                                                                                       |
| `lead-select.test.tsx`                      | 3     | 2+ char minimum enforced, result click calls `onChange`, no-results message                                                                                             |
| `pipeline-stage-card.test.tsx`              | 5     | Not-generated vs generated status, Generate vs Re-generate label, permission-gated hidden action, blocked-reason message shown instead of a button                      |
| `website-pipeline-panel.test.tsx`           | 5     | Theme precondition link, each stage's blocked-reason chained to its real predecessor, successful generate toast, backend error shown verbatim                           |
| `website-generator-dashboard-page.test.tsx` | 3     | No panel before selection, `?leadId=` pushed on selection, panel renders correctly when `?leadId=` is already in the URL (reload-safe)                                  |
| `layout-viewer.test.tsx`                    | 4     | Sections sorted by `order`, hierarchy via `componentPlaceholders`, full metadata dump, no-layout-yet state                                                              |
| `component-viewer.test.tsx`                 | 3     | DataTable summary + full detail cards rendered, no save/edit affordance anywhere, no-components-yet state                                                               |
| `content-viewer.test.tsx`                   | 5     | Bound Content table combines text+CTA, image references shown as tokens only (never `<img>`), SEO/structured-data card, unresolved bindings shown, no-content-yet state |
| `generated-website-overview.test.tsx`       | 4     | Metadata + files summary + cross-pipeline passthrough fields, Generate action shown/hidden by permission, view links to Layout/Components/Content                       |

**Totals:** 34 new tests (7 unit, 27 integration). `apps/admin-web` 286/286 (up from 252), across 74 test files. Full monorepo build/typecheck/lint/test clean; a real `next build` re-run clean — `/website-generator` (2.88 kB), `/website-generator/[leadId]` (4.37 kB), `/website-generator/[leadId]/layout` (2.01 kB), `/website-generator/[leadId]/components` (1.92 kB), `/website-generator/[leadId]/content` (2.33 kB), no RSC `'use client'` boundary issue.

## 6. Security Review

- **AuthZ** — `layout:generate`/`component:generate`/`content:bind`/`website:assemble` are each enforced client-side only for UI convenience (hiding the relevant stage's action); the backend's own guards on each `POST` endpoint remain the sole real enforcement. `leads:read` needs no gate since every role holds it.
- **No new data exposure** — every field rendered comes directly from the four existing M8.x endpoints' own response shapes (plus F4's/F6's/F7's already-reviewed endpoints reused for lead selection and cross-pipeline passthrough); no field is fabricated or guessed from adjacent data.
- **`leadId` comes from the URL, validated only by the backend** — an unknown or unauthorized id returns the backend's real error, rendered as an inline `ErrorState`.
- **No polling anywhere** — all four `use-*-configuration`/`use-*-manifest`/`use-generated-website` hooks are plain one-shot `useQuery` calls with no `refetchInterval`, since none of the four resources has an async/pending state to observe (DECISIONS.md D-165) — no possibility of amplifying backend load through repeated background reads.
- **Trigger requests carry no client-supplied payload** — all four `POST` mutations take no body; the only client-controlled input is the `leadId` in the URL path, independently resolved and authorized by the backend at every stage.
- **Images are never rendered as live `<img>` tags** — Content Viewer shows `photoReference` values as opaque text tokens only, per the founder's explicit "references only" instruction, avoiding any risk of loading an unvalidated remote URL.

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application, backend, or AI provider was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1-F7.
- **"Component Name" is `componentId`** — no separate display name exists anywhere in `ComponentDefinition`. See DECISIONS.md D-166.
- **Text Content and CTA Content cannot be split into separate sections** — the backend's `componentContent` schema has no field distinguishing the two; both are shown together as "Bound Content." See DECISIONS.md D-167.
- **"Theme Used"/"Business Analysis Version"/"Theme Configuration Version" depend on F6's/F7's own read surfaces, which return only the latest record** — if either has been re-run since the website was generated, the passthrough values shown can diverge from what the website was actually generated from at the time. This is a structural gap in the backend's own read surface (no versioned-lookup-by-id endpoint exists for either), the same category of limitation F7 already documented for its own brand-value passthrough (D-158).

## 8. Approval Checklist

- [x] All five Pages and every founder-listed Dashboard/Viewer/Overview feature delivered, with the permission-scope gap resolved per founder approval — §1, §3
- [x] The Layout→Component→Content→Website dependency chain, verified by reading all four backend services in full, drives the Dashboard's real behavior rather than a single button that would silently 404 — §3, DECISIONS.md D-164
- [x] Every other real backend divergence (no separate component name, no text/CTA distinction, no files-summary field, no denormalized theme/analysis version fields) resolved directly by this module's own governing rules — §3, DECISIONS.md D-166 through D-169
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified beyond the one approved additive `NAV_ITEMS` entry and its mechanical test update — §2
- [x] Every request targets one of the eight existing M8.x endpoints, or F4's/F6's/F7's already-reviewed endpoints reused directly — no new endpoint, no new permission — §2
- [x] No polling built, correctly matching all four resources' genuinely synchronous behavior — never simulated — §3, DECISIONS.md D-165
- [x] DataTable/StatusBadge/PermissionGate/ErrorState/Skeletons/AppShell reused directly, zero duplicated components — §1, §4
- [x] Real `next build` run, not just typecheck/lint/test — clean, no RSC boundary issue
- [x] Full test suite green (34 new; 286 `apps/admin-web` total)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-163 through D-169) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
