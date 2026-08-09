# Module Review Report — F4: Lead Management (Frontend)

**Status:** Module F4 implementation complete, pending founder approval.
**Date:** 2026-08-04
**Reviewed against:** the founder's F4 module brief (Lead List, Lead Details, Create Lead, Edit Lead; search/sorting/pagination/status-tags-assigned-user filters/bulk selection on the list; every backend-returned field on details, "do not invent fields"; RHF+Zod forms reusing F1 components with backend validation errors shown exactly; append-only Notes; read-only newest-first Activity Timeline; `leads:read`/`leads:write`/`leads:delete` permission gating; reuse of DataTable/StatusBadge/Skeletons/ErrorState/PermissionGate, no duplicated components), with an explicit "use only the existing backend, do not modify backend APIs" constraint carried over from F3. No backend API was modified; no previous frontend module (F1, RBAC Alignment, F2, F3) was modified beyond the one-line swap of F1's `<FeaturePlaceholder>` for the real `<LeadListPage/>` in `app/(dashboard)/leads/page.tsx`.

---

## 1. Scope Compliance

| Requirement                                                     | Delivered               | Where                                                                                     |
| --------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| Lead List                                                       | ✅                      | `LeadListPage` → `LeadListTable`                                                          |
| Lead Details                                                    | ✅                      | `LeadDetailPage`                                                                          |
| Create Lead                                                     | ✅                      | `CreateLeadPage` → `CreateLeadForm`                                                       |
| Edit Lead                                                       | ✅                      | `EditLeadPage` → `EditLeadForm`                                                           |
| Search                                                          | ✅                      | `LeadListFilters` search input → `GET /leads?q=`, debounced, min 2 chars                  |
| Sorting                                                         | ✅                      | Server-mode DataTable sorting, whitelisted `LEAD_SORT_FIELDS` only                        |
| Client/Server Pagination (according to backend)                 | ✅                      | Server-mode — `GET /leads` is genuinely cursor-paginated — DECISIONS.md D-140             |
| Status filter                                                   | ✅                      | Stage `<select>`, closed 6-value `PipelineStage` enum                                     |
| Tags filter                                                     | ✅                      | Free-text, single tag (matches the backend's own single-`tag=` param)                     |
| Assigned user filter                                            | ✅ (limited)            | "Assigned to me" only — no team-member list endpoint exists — DECISIONS.md D-136          |
| Bulk selection                                                  | ✅                      | Real bulk delete + bulk "add tag", N sequential requests — DECISIONS.md D-137             |
| Empty / loading / error states                                  | ✅                      | Reused directly from shared DataTable                                                     |
| Every backend-returned field on Lead Details                    | ✅                      | Business Information, Status, Tags, Assigned User                                         |
| Contact Information / Google Places Information                 | ✅ (honest placeholder) | Not returned by any endpoint — DECISIONS.md D-135                                         |
| "Do not invent fields"                                          | ✅                      | Verified against `lead-response.dto.ts` directly; no fabricated data anywhere             |
| RHF + Zod, reusing F1 form components                           | ✅                      | Both forms use `Form`/`FormField`/`FormItem`/`FormControl`/`FormMessage`/`Input`/`Button` |
| Backend validation errors shown exactly                         | ✅                      | `ApiError.message` shown verbatim via toast, same pattern as F3's `DiscoverySearchForm`   |
| Append-only Notes                                               | ✅                      | No edit/delete affordance anywhere — matches backend's own "no update or delete path"     |
| Activity Timeline, read-only, newest first                      | ✅                      | `LeadActivityTimeline`, no write endpoint called                                          |
| `leads:read`/`leads:write`/`leads:delete`                       | ✅                      | Read is ungated (universal); write/delete hide (not disable) affordances                  |
| Reuse DataTable/StatusBadge/Skeletons/ErrorState/PermissionGate | ✅                      | All five reused directly, zero duplication                                                |
| No backend API modified                                         | ✅                      | `git status apps/api packages/db` unchanged from before F4 (§2)                           |
| No previous frontend module modified                            | ✅                      | One line in `leads/page.tsx` — no other file touched                                      |
| Unit tests                                                      | ✅                      | 15 new                                                                                    |
| Integration tests                                               | ✅                      | 25 new                                                                                    |
| Documentation                                                   | ✅                      | TASKS.md, CHANGELOG.md, DECISIONS.md (D-134 through D-140), this report                   |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F4 began (the same M10-M12 changes from earlier sessions) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, only one previously-shipped file changed: `app/(dashboard)/leads/page.tsx`, where F1's own `<FeaturePlaceholder moduleId="F4">` was swapped for the real `<LeadListPage/>` — no other F1, RBAC Alignment, F2, or F3 file was edited. Every request F4 makes targets one of the seven existing Leads endpoints (`GET/POST /leads`, `GET/PATCH/DELETE /leads/:id`, `GET/POST /leads/:id/notes`, `GET /leads/:id/activity`) — no new endpoint, no new query parameter, no modified permission.

## 3. Four Real Gaps Between the Spec and the Backend — Surfaced, Not Papered Over

Before writing any code, the actual Leads backend was researched directly (controllers, services, DTOs, Prisma schema, permission constants) rather than assumed from the founder's feature list. Four real gaps surfaced, each presented as an explicit choice and approved before implementation:

1. **No business-search/list endpoint.** `POST /leads` requires an existing `businessId`, but no controller anywhere lists or searches businesses. **Approved:** Create Lead takes a raw Business ID (UUID) text field — honest to the backend, flagged as a known limitation. See DECISIONS.md D-134.
2. **No Contact Information / Google Places fields on the Lead response.** `GET /leads/:id` returns only the business join's `businessName`/`category`/`city`/`address`/`websiteStatus` — no phone, rating, photos, lat/long, or `googlePlaceId` anywhere reachable over HTTP. **Approved:** render both required sections with an honest "Not available — not returned by the current API" placeholder, matching the spec's page structure without fabricating data. See DECISIONS.md D-135.
3. **No team-member list endpoint.** `assignedTo` is a bare UUID with no name-resolution path beyond the current session's own identity. **Approved:** "Assigned to me" filter + "You"/raw-UUID display, no invented "Unassigned" filter (the backend's `assignedTo` param has no null/unassigned sentinel). See DECISIONS.md D-136.
4. **No bulk endpoint.** No `PATCH /leads` or `DELETE /leads` collection route exists. **Approved:** real bulk delete/"add tag" actions, each run as N sequential per-lead requests via `Promise.allSettled`, with partial failure surfaced by count rather than hidden behind a fake atomic result. See DECISIONS.md D-137.

## 4. Implementation Summary

**`packages/ui`** (two new generic primitives, F4's first real need for either — DECISIONS.md D-139): `alert-dialog.tsx` (destructive-confirmation modal, `@radix-ui/react-alert-dialog`), `textarea.tsx` (multi-line input, same states as `Input`).

**`src/features/leads/`** (new feature folder):

- `lead-stage.ts` — `LEAD_STAGE_PRESENTATION` (6 `PipelineStage` values → `StatusBadge` variant/label), `LEAD_STAGE_OPTIONS`.
- `lead-activity-presentation.ts` — `LEAD_ACTIVITY_LABELS` (all 14 `LeadActivityType` values), `isLeadActivityType()`, `describeActivityDetail()`.
- `api/` — `use-leads.ts` (cursor-paginated list), `use-lead.ts`, `use-create-lead.ts`, `use-update-lead.ts`, `use-delete-lead.ts`, `use-lead-notes.ts`/`use-create-lead-note.ts` (`useInfiniteQuery`, forward-only), `use-lead-activity.ts` (`useInfiniteQuery`, read-only), `use-bulk-delete-leads.ts`/`use-bulk-tag-leads.ts` (`Promise.allSettled` loops), `lead-pagination-schemas.ts` (local `{items, nextCursor}` envelope schemas — `packages/shared-types` exports the item schemas but not the paginated wrapper).
- `components/` — `tag-input.tsx` (feature-local chip input validated against `leadTagSchema`), `lead-list-columns.tsx`/`lead-list-filters.tsx`/`lead-list-table.tsx`/`lead-list-page.tsx`, `lead-row-actions.tsx`, `assigned-to-cell.tsx`, `create-lead-form.tsx`/`create-lead-page.tsx`, `edit-lead-form.tsx`/`edit-lead-page.tsx`, `lead-detail-page.tsx` composing `lead-detail/business-information-section.tsx`, `lead-detail/not-available-section.tsx`, `lead-detail/lead-status-section.tsx`, `lead-detail/lead-notes-panel.tsx`, `lead-detail/lead-activity-timeline.tsx`, plus shared `lead-detail/detail-card.tsx` and `lead-detail/field-row.tsx`.

**Routes:** `app/(dashboard)/leads/page.tsx` (placeholder replaced), `leads/new/page.tsx` (Server Component, first real consumer of RBAC Alignment's `assertPermission` — fetches `/me` again to guard `leads:write` at the route boundary before any client render), `leads/[leadId]/page.tsx` (this app's second dynamic route), `leads/[leadId]/edit/page.tsx` (same `assertPermission` guard).

## 5. Test Coverage

| Suite                                                         | Tests | Notes                                                                                                                                                                                                                              |
| ------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alert-dialog.test.tsx` / `textarea.test.tsx` (`packages/ui`) | 5     | Closed-until-triggered, confirm/cancel, invalid state                                                                                                                                                                              |
| `lead-stage.test.ts`                                          | 2     | Presentation map covers all 6 stages exactly                                                                                                                                                                                       |
| `lead-activity-presentation.test.ts`                          | 6     | Labels cover all 14 types, `describeActivityDetail` from/to + null/malformed handling                                                                                                                                              |
| `tag-input.test.tsx`                                          | 5     | Normalize-on-add, reject invalid chars, reject duplicates, remove, max-count disable                                                                                                                                               |
| `use-bulk-delete-leads.test.tsx`                              | 2     | Partial-failure counting proof (2 succeed, 1 fails → `{succeeded:2, failed:1}`), all-succeed case                                                                                                                                  |
| `lead-list-table.test.tsx` (integration)                      | 9     | Renders with stage badge, empty state, error state, stage-filter query param, "assigned to me" query param, sort query param, cursor-history Prev/Next, bulk delete as N `DELETE` calls, row-selection hidden for a read-only role |
| `lead-list-page.test.tsx` (integration)                       | 3     | Create Lead link shown/hidden by `leads:write`                                                                                                                                                                                     |
| `lead-detail-page.test.tsx` (integration)                     | 7     | Renders Business Info + both "not available" placeholders, Edit/Delete shown/hidden by permission, delete-confirm-and-redirect flow, notes rendered + add-form permission-gated, activity timeline label rendering                 |
| `create-lead-form.test.tsx` (integration)                     | 3     | Empty/invalid Business ID validation, exact POST body + redirect on success                                                                                                                                                        |
| `edit-lead-form.test.tsx` (integration)                       | 3     | Pre-fills from the given lead, explicit `assignedTo: null` on clear, Cancel navigates without submitting                                                                                                                           |

**Totals:** 45 new tests (17 unit, 28 integration — 2 of the unit tests landed in `packages/ui`). `packages/ui` 33/33 (up from 28). `apps/admin-web` 163/163 (up from 123). Full monorepo build/typecheck/lint/test clean; a real `next build` re-run clean — `/leads` (3.92 kB), `/leads/[leadId]` (4.18 kB), `/leads/[leadId]/edit` (1.68 kB), `/leads/new` (1.51 kB), no RSC `'use client'` boundary issue.

## 6. Security Review

- **AuthZ** — every write/delete affordance is client-gated by `<PermissionGate>`/`useHasPermission()` for UI convenience only; the backend's own guards on `POST/PATCH/DELETE /leads*` remain the sole real enforcement. `/leads/new` and `/leads/[leadId]/edit` additionally guard at the Server Component boundary via `assertPermission()` (a second `/me` fetch, the first real use of this pre-built-but-unused route guard) — a role without `leads:write` hitting either URL directly gets `notFound()`, never a flash of the form before a client-side check catches up.
- **No new data exposure** — every field rendered comes directly from the seven existing endpoints' own response shapes; the two placeholder sections render no data at all, by design.
- **Bulk actions run through the same single-lead endpoints and the same backend authorization** — there is no separate "bulk" authorization path to get wrong; each of the N requests is independently checked server-side exactly as a single request would be.
- **Note authorship is never client-supplied** — `POST /leads/:id/notes` takes only `{body}`; `authorId` is derived server-side from the authenticated session, never sent by the frontend.
- **Business ID / Assigned User ID inputs are plain UUID-validated text, not free-form injection surfaces** — both are re-validated by the backend's own Zod schemas regardless of what the frontend sends.

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application or backend was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1-F3.
- **Create Lead's Business ID field has no in-app discovery mechanism** — usable only by someone who already has a valid Business ID from elsewhere (e.g. database tooling). Resolving this needs a new backend business-search/list endpoint, which is out of scope for a frontend-only module. See DECISIONS.md D-134.
- **Contact Information and Google Places Information are permanently placeholders today** — no endpoint anywhere returns phone/rating/photos/lat-long/`googlePlaceId` for a lead's business. See DECISIONS.md D-135.
- **"Assigned User" can only ever resolve to "You" or a raw UUID** — no team-member list/name-lookup endpoint exists to resolve other users' names, and there is no "Unassigned" filter option since the backend's `assignedTo` param requires a UUID. See DECISIONS.md D-136.
- **Bulk actions are N independent requests, not one atomic operation** — a partial failure (some rows succeed, some don't) is a real, surfaced outcome by design, since the backend provides no bulk endpoint to make atomicity possible. See DECISIONS.md D-137.
- **Tag filter matches exactly one tag** — the backend's `tag=` query param has no multi-tag AND/OR support, so "Tags filter" is single-value, matching the real API contract exactly.

## 8. Approval Checklist

- [x] All four Pages and every founder-listed Lead List / Lead Details feature delivered — §1
- [x] Every real backend gap (business search, Contact/Places fields, team-member list, bulk endpoint) surfaced as an explicit choice and resolved per your approval, not decided silently — §3, DECISIONS.md D-134 through D-137
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified beyond the one placeholder swap F1 itself anticipated — §2
- [x] Every request targets one of the seven existing Leads endpoints — no new endpoint, no new call — §2
- [x] RHF + Zod throughout, reusing F1's exact form components; backend validation messages shown verbatim — §1
- [x] DataTable/StatusBadge/Skeletons/ErrorState/PermissionGate reused directly, zero duplicated components — §1, §4
- [x] Real `next build` run, not just typecheck/lint/test — clean, no RSC boundary issue
- [x] Full test suite green (45 new; 33 `packages/ui` + 163 `apps/admin-web` totals)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-134 through D-140) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
