# Module Review Report — F10: Sales CRM (Frontend)

**Status:** Module F10 implementation complete, pending founder approval.
**Date:** 2026-08-05
**Reviewed against:** the founder's F10 module brief (CRM Dashboard, Pipeline Board, Lead CRM Details, Tasks, Activities, Proposals, Reports; CRM Dashboard's 8-bullet metric list, "never calculate business metrics on the frontend"; Pipeline Board's Lead Cards/Stage Counts/Deal Value/Assigned User/Current Stage, "allow stage movement only if backend supports it... never fake drag & drop"; Lead CRM Details' 8-section display list, "only backend fields"; Tasks' List/Create/Edit/Complete/Cancel, "use backend status only"; Activities' Calls/Meetings/Emails/WhatsApp/Notes, "never merge or infer activity types"; Proposals' "read-only tracking... do not generate proposals... do not edit proposal content unless backend supports it"; Reports' "never calculate: Pipeline Value, Conversion Rate, Win Rate, Lost Reasons, Sales Performance"; `crm:view`/`crm:manage`/`crm:assign`/`crm:report` permissions, hide actions when permission is missing; reuse of DataTable/StatusBadge/PermissionGate/Cards/Tabs/Dialogs/Forms/Skeletons/ErrorState; `src/features/crm/`). No backend API was modified; no previous frontend module was modified at all — F10 needed no new `NAV_ITEMS` entry, since `/crm` already existed (gated `crm:view` since the RBAC Alignment module) and only its F1-era placeholder page was replaced.

---

## 1. Scope Compliance

| Requirement                                                                                                | Delivered                                  | Where                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| CRM Dashboard                                                                                              | ✅                                         | `CrmDashboardPage`                                                                                                              |
| Pipeline Board                                                                                             | ✅ (bounded, paginated — founder-approved) | `PipelineBoardPage` — DECISIONS.md D-177                                                                                        |
| Lead CRM Details                                                                                           | ✅                                         | `LeadCrmDetailsPage`                                                                                                            |
| Tasks                                                                                                      | ✅                                         | `TasksPage` + dialogs                                                                                                           |
| Activities                                                                                                 | ✅                                         | `ActivitiesPage`                                                                                                                |
| Proposals                                                                                                  | ✅                                         | `ProposalsPage`                                                                                                                 |
| Reports                                                                                                    | ✅                                         | `ReportsPage`                                                                                                                   |
| Pipeline Summary / Sales Performance / Conversion Rate / Win Rate / Lost Reasons / Avg Sales Cycle         | ✅                                         | Direct `DashboardStats` fields, reusing F2's `useCrmDashboard()`                                                                |
| Assigned Leads                                                                                             | ✅ (mapped, no dedicated field exists)     | `salesPerformanceByRep`'s per-rep counts — DECISIONS.md D-179                                                                   |
| Upcoming Tasks                                                                                             | ✅ (real separate fetch)                   | `useUpcomingTasks()`, `GET /crm/tasks?status=pending&dueBefore=`                                                                |
| "Never calculate business metrics on the frontend"                                                         | ✅                                         | Verified against `dashboardStatsSchema` directly — every number is a passthrough field                                          |
| Lead Cards / Stage Counts / Deal Value / Assigned User / Current Stage                                     | ✅                                         | `LeadCard`/`StageColumn`, joining `Lead` + `LeadCRM` client-side                                                                |
| "Allow stage movement only if backend supports it... never fake drag & drop"                               | ✅                                         | Real HTML5 drag-and-drop AND an explicit stage picker, both call the one real `POST /leads/:id/crm/stage`                       |
| Lead Information / CRM Status / Assigned User / Tasks / Activities / Proposals / Website Status / Timeline | ✅                                         | `LeadCrmDetailsPage`, all 8 sections                                                                                            |
| Tasks: List/Create/Edit/Complete/Cancel                                                                    | ✅                                         | `GET/PATCH /crm/tasks`, `GET/POST /leads/:id/tasks` — Complete/Cancel both `PATCH .../tasks/:id`                                |
| "Use backend status only"                                                                                  | ✅                                         | `TASK_STATUSES` (4 real values), no invented state                                                                              |
| Calls / Meetings / Emails / WhatsApp / Notes                                                               | ✅                                         | 5 `Tabs` panels — 4 real `LeadActivityType` values + `LeadNote`, never merged                                                   |
| "Never merge or infer activity types"                                                                      | ✅                                         | Verified — Notes is a genuinely separate backend entity, shown from its own hook, own tab                                       |
| Proposal List / Version / Status / Sent / Viewed / Accepted / Rejected Date                                | ✅                                         | `ProposalList`, exact `salesProposalSchema` fields (`sentAt` not `sentDate`, etc.)                                              |
| "Read-only tracking. Do not generate. Do not edit content."                                                | ✅                                         | Zero interactive controls anywhere on Proposals — DECISIONS.md D-181                                                            |
| "Never calculate: Pipeline Value, Conversion Rate, Win Rate, Lost Reasons, Sales Performance" (Reports)    | ✅                                         | Same `dashboardStatsSchema` fields as Dashboard, real `fromDate`/`toDate` params — DECISIONS.md D-178                           |
| `crm:view`/`crm:manage`/`crm:assign`/`crm:report`, hide actions when missing                               | ✅                                         | `crm:view` gates entire page content (not just an action) via shared `CrmViewGate`; the other three gate their own real actions |
| Reuse DataTable/StatusBadge/PermissionGate/Cards/Tabs/Dialogs/Forms/Skeletons/ErrorState                   | ✅                                         | All reused; `Dialog` newly promoted (D-176)                                                                                     |
| `src/features/crm/`, existing architecture                                                                 | ✅                                         | Mirrors `src/features/website-preview/`'s structure                                                                             |
| No backend API modified                                                                                    | ✅                                         | `git status apps/api packages/db` unchanged from before F10 (§2)                                                                |
| No previous frontend module modified                                                                       | ✅                                         | Zero — not even a `NAV_ITEMS` entry, since one already existed — §2                                                             |
| Unit tests                                                                                                 | ✅                                         | 6 new                                                                                                                           |
| Integration tests                                                                                          | ✅                                         | 21 new                                                                                                                          |
| Documentation                                                                                              | ✅                                         | TASKS.md, CHANGELOG.md, DECISIONS.md (D-176 through D-181), this report                                                         |

## 2. Backend/Previous-Module Boundary — Verified, Not Assumed

```
git status --short apps/api packages/db apps/web
```

returns nothing beyond what was already present before F10 began (the same M10-M12 changes carried since earlier sessions, the identical set every prior module's review has documented as pre-existing) — **zero files under `apps/api`, `packages/db`, or `apps/web` were touched.** Within `apps/admin-web`, F10 is the first module in this whole F1-F10 sequence that required **no change at all** to any previously-shipped file — not even the usual one additive `NAV_ITEMS` entry, since `{ id: 'crm', label: 'Sales CRM', href: '/crm', requiredPermission: 'crm:view' }` was already present (added during RBAC Alignment, F1's own placeholder having anticipated this module by name). Only the placeholder body of `app/(dashboard)/crm/page.tsx` was replaced — the same category of change F3 already established and got approval for with its own `/leads` placeholder swap. `packages/ui` gained one wholly new file (`dialog.tsx`) — additive only, reusing the `@radix-ui/react-dialog` dependency already installed for `Sheet`, no new package. Every request F10 makes targets one of the real M10 endpoints (§3) plus F4's/F8's own already-reviewed endpoints reused directly for lead info, activity, notes, and generated-website preconditions — no new endpoint, no new query parameter, no modified or new backend permission.

## 3. Backend Reality vs. the Brief — One Escalated Gap, Several Resolved Directly

Research read all five M10 controllers/services in full (`apps/api/src/crm/{pipeline,tasks,activities,proposals,reporting}/`), plus every relevant `packages/shared-types` schema, before writing any component.

**The one genuine architectural gap, escalated and resolved per founder approval:**

**Pipeline Board has no bulk data source.** There is no endpoint returning leads with their CRM stage/deal-value/owner in one call — `GET /crm/dashboard`'s `pipelineValueByStage` is aggregate-only (counts/sums, excludes won/lost, no lead-level data at all). Building real Lead Cards requires `GET /leads` (business info) joined client-side with a separate `GET /leads/:id/crm` per lead — a real N+1, with no way around it. This was presented as an explicit choice (bounded/paginated board vs. stage-summary-only vs. literal unbounded fetch-everything) and the founder approved the bounded/paginated option. See §1 of this report and DECISIONS.md D-177 for the full resolution.

**Every other divergence was resolved directly**, following F6-F9's established discipline — the brief's own governing rules ("never invent data," "use backend status only," "never merge or infer activity types," "read-only tracking," "never calculate...") left exactly one compliant path in each case:

1. **CRM Dashboard's "Assigned Leads" and "Upcoming Tasks" have no dedicated `DashboardStats` fields.** Confirmed by reading `dashboard-stats.ts` in full. "Assigned Leads" is answered by the real `salesPerformanceByRep` per-rep breakdown; "Upcoming Tasks" is a real, separate `GET /crm/tasks?status=pending&dueBefore=` call — the same "combine two already-reviewed endpoints" pattern F8's D-169 established. See D-179.
2. **Activities' "Notes" isn't a `LeadActivityType`.** It's the separate `LeadNote` entity (M4). Shown in its own `Tabs` panel from F4's own `useLeadNotes()`, never merged into the activity array. Both Activities and Proposals use a "Select Lead" pattern, since neither `GET /leads/:id/activity` nor `GET /leads/:id/proposals` has a cross-lead variant. See D-180.
3. **Proposals has no content-editing endpoint, and its own section brief says "Read-only tracking."** Confirmed against the controller's own doc comment: "no DELETE and no content-editing PATCH... every version endures once created." Status _is_ technically mutable via a real endpoint, but the brief's explicit "read-only tracking" framing — not just the content-editing gap — rules out exposing even that here. See D-181, and §7's Known Limitations for the explicit flag that this is a scope choice, not a backend constraint.
4. **Reports and CRM Dashboard ask for near-identical metrics from the single real reporting endpoint.** `GET /crm/dashboard` is the _only_ reporting endpoint in the entire backend (confirmed: `reporting.controller.ts`'s own `@Controller` decorator is `'crm/dashboard'`, no `/crm/reporting/*` exists). Differentiated by real `fromDate`/`toDate` query params (which `DashboardQuery` supports but F2's own Dashboard hook deliberately never uses) and detailed breakdown tables instead of duplicating the Dashboard's summary cards. See D-178.
5. **`Dialog` doesn't exist yet in `packages/ui`**, despite being named in the brief's reuse list. Promoted directly, following F4's `AlertDialog`/`Textarea` and F9's `Tabs`/`Card` precedent. See D-176.

None of items 1-5 required `AskUserQuestion` — only the Pipeline Board's data-source gap involved a genuine multi-path engineering trade-off worth surfacing.

## 4. Implementation Summary

**`packages/ui/src/components/dialog.tsx`** (new) — centered modal, reusing the `@radix-ui/react-dialog` dependency already installed for `Sheet`.

**`src/features/crm/`** (new feature folder):

- `api/` — `use-sales-stages`, `use-lost-reasons`, `use-lead-crm` (+ `leadCrmQueryKey`/`fetchLeadCrm` exports shared with the board's batch fetch), `use-transition-stage` (single-lead) / `use-transition-stage-any` (board, hook-safe for a changing lead set), `use-assign-owner`, `use-website-generation-status`, `use-crm-tasks`/`use-lead-tasks`/`use-create-task`/`use-update-task`, `use-upcoming-tasks`, `use-lead-proposals`, `use-crm-reports`, `use-board-leads` (infinite query accumulator) / `use-board-leads-crm` (`useQueries` batch).
- `components/` — `crm-view-gate.tsx` (shared `crm:view` page gate, reused 7×), `lead-select.tsx` (feature-local duplicate), `activity-list.tsx`/`proposal-list.tsx` (shared between Lead CRM Details and their standalone pages), `lead-card.tsx`/`stage-column.tsx`/`lost-reason-dialog.tsx`/`pipeline-board-page.tsx`, `create-task-dialog.tsx`/`edit-task-dialog.tsx`/`task-row-actions.tsx`/`task-list-columns.tsx`/`tasks-page.tsx`, `crm-dashboard-page.tsx`, `lead-crm-details-page.tsx`, `activities-page.tsx`, `proposals-page.tsx`, `reports-page.tsx`.
- `status.ts` / `activity-labels.ts` / `format.ts` — feature-local presentation-mapping duplicates, same convention as F3-F9's own `status.ts` files and F9's `format.ts` duplicate.

**`app/(dashboard)/crm/{page.tsx (replaced), pipeline,leads/[leadId],tasks,activities,proposals,reports}/page.tsx`** (routes).

## 5. Test Coverage

| Suite                                        | Tests | Notes                                                                                                                                  |
| -------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/components/dialog.test.tsx` | 3     | Closed until trigger click, opens and shows content, closes via `DialogClose` without firing the submit handler                        |
| `use-lead-crm.test.tsx`                      | 1     | Single fetch, no polling                                                                                                               |
| `use-transition-stage-any.test.tsx`          | 1     | Posts to the correct per-lead endpoint with real `leadId` from mutate variables                                                        |
| `lead-select.test.tsx`                       | 3     | 2+ char minimum, result click calls `onChange`                                                                                         |
| `task-row-actions.test.tsx`                  | 4     | Hidden without `crm:manage`, shown for a pending task, hidden once terminal, real `PATCH {status:'completed'}` call                    |
| `create-task-dialog.test.tsx`                | 3     | Validation blocks empty title, submission disabled until a lead is picked (no fixed `leadId`), real `POST` with fixed `leadId`         |
| `tasks-page.test.tsx`                        | 3     | Renders real task list, "New Task" gated `crm:manage`, entire page gated `crm:view`                                                    |
| `crm-dashboard-page.test.tsx`                | 2     | Every real field rendered, `crm:report`-gated (distinct from the page's own `crm:view` gate)                                           |
| `pipeline-board-page.test.tsx`               | 3     | Real stage columns from `GET /crm/stages`, lost-reason prompt before an `isLost` move, real `POST` with the chosen `lostReasonId`      |
| `lead-crm-details-page.test.tsx`             | 1     | All 8 sections render with real backend data                                                                                           |
| `activities-page.test.tsx`                   | 3     | Default Calls tab filtered correctly, Notes tab never shows activities, system events (`stage_changed`) never leak into a category tab |
| `proposals-page.test.tsx`                    | 1     | Displays every real field, zero interactive controls                                                                                   |
| `reports-page.test.tsx`                      | 2     | Renders detailed breakdown tables, real `fromDate` query param on filter change                                                        |

**Totals:** 30 new tests (6 `packages/ui`-adjacent... — 3 `packages/ui` Dialog tests + 27 `src/features/crm` tests: 6 unit, 21 integration). `apps/admin-web` 338/338 (up from 311), across 93 test files. `packages/ui` 40/40 (up from 37). Full monorepo build/typecheck/lint/test clean; a real `next build` run clean — all 7 F10 routes present (`/crm` 2.9 kB, `/crm/pipeline` 7.07 kB, `/crm/leads/[leadId]` 4.37 kB, `/crm/tasks` 1.77 kB, `/crm/activities` 3.48 kB, `/crm/proposals` 2.93 kB, `/crm/reports` 2.42 kB), no RSC `'use client'` boundary issue.

## 6. Security Review

- **AuthZ** — `crm:view` is enforced client-side (via the shared `CrmViewGate`) for UI convenience across all 7 pages; the backend's own guards on every M10 route remain the sole real enforcement. `crm:manage`/`crm:assign`/`crm:report` each gate their own real action/page precisely matching the backend's own permission split (confirmed against `permission.constants.ts` directly, not assumed).
- **No new data exposure** — every field rendered comes directly from the five M10 endpoints' own response shapes, plus F4's/F8's already-reviewed endpoints reused for lead info, activity, notes, and website-status; "Publish Recommendation"-style invented fields are never fabricated anywhere in this module.
- **Pipeline Board's N+1 is bounded, not unbounded** — capped at the currently-loaded page of leads (25 per page, explicit "Load More"), never an unbounded fetch-everything that could be used to enumerate the entire lead base in one action.
- **Stage transitions and owner reassignment carry only the fields the backend accepts** — `{stageId, lostReasonId?}` and `{ownerId}` respectively, no extra client-supplied payload; the backend's own validation (`SalesStageNotFoundException`, `LostReasonRequiredException`, `TeamMemberNotFoundException`) is the real authority, this module's own pre-checks (e.g. prompting for a lost reason before submitting) are UX conveniences only.
- **Proposal content is never rendered as executed/live markup** — the read-only `ProposalList` shows plain text fields only (version/status/dates), and proposal `content` itself is never displayed or evaluated anywhere in F10, since no page in this module's scope needed it.

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application, backend, or AI provider was exercised — build/tests use dummy Clerk keys and a mocked `fetch` boundary, same constraint as F1-F9.
- **Pipeline Board only reflects currently-loaded leads, not the entire pipeline at a glance** — a real, verified backend gap (no bulk `LeadCRM` list endpoint), resolved as a bounded/paginated board per explicit founder approval. See DECISIONS.md D-177.
- **Proposal status transitions (Send/Accept/Reject) are real, backend-permitted actions this module deliberately does not expose** — not a backend limitation being worked around, but a direct reading of the brief's own "Read-only tracking" section header. Flagged here explicitly as a scope choice the founder may want to revisit in a future pass, not something F10 was unable to build. See DECISIONS.md D-181.
- **"Assigned User ID" fields (Task assignment, Lead CRM Details' owner reassignment) are raw UUID inputs, no team-member picker** — the same flagged limitation F4 already documented (no team-member-list endpoint exists anywhere in the backend).

## 8. Approval Checklist

- [x] All seven founder-listed pages delivered, with the one real architectural gap (Pipeline Board's data source) escalated and resolved per founder approval — §1, §3
- [x] Every other real backend divergence (Assigned Leads/Upcoming Tasks mapping, Activities/Notes never merged, Proposals read-only, Reports/Dashboard differentiation, missing Dialog primitive) resolved directly by this module's own governing rules — §3, DECISIONS.md D-176 through D-181
- [x] Backend verified untouched — `git status` shows zero `apps/api`/`packages/db`/`apps/web` changes from this module — §2
- [x] No previous frontend module modified at all — not even a new `NAV_ITEMS` entry, since one already existed — §2
- [x] Every request targets one of the five real M10 endpoints, or F4's/F8's already-reviewed endpoints reused directly — no new endpoint, no new permission — §2
- [x] Stage movement is real, never faked — both drag-and-drop and the explicit picker call the one real transition endpoint — §1, §3
- [x] DataTable/StatusBadge/PermissionGate/Cards/Tabs/Forms/Skeletons/ErrorState/AppShell reused directly; Dialog newly promoted per the brief's own instruction, zero duplicated shared components — §1, §4
- [x] Real `next build` run, not just typecheck/lint/test — clean, all 7 routes present, no RSC boundary issue
- [x] Full test suite green (30 new; 338 `apps/admin-web` total, 40 `packages/ui` total)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-176 through D-181) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
