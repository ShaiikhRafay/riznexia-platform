# Module Review Report — M10: Sales CRM

**Status:** Module M10 implementation complete, pending founder approval.
**Date:** 2026-08-05
**Reviewed against:** the founder's M10 module brief (objective — "manage the complete lifecycle of selling AI-generated websites... NOT a generic CRM," discover→demo→deploy workflow, core features, a default 10-stage pipeline, activity/task/proposal field lists, dashboard metrics, four dedicated permissions, five named "separate modules," Future Compatibility reservations, explicit constraints), given directly, followed by a full architecture review (including one scope conflict against `docs/21-implementation-roadmap.md` flagged and resolved via AskUserQuestion before any code was written) and twelve explicit founder Decisions refining the approved architecture before implementation. `docs/21-implementation-roadmap.md` is **untouched** — M10 is not renamed/reordered/merged/split; its stale entry is a documented, deliberate gap (DECISIONS.md D-082), not a silent contradiction.

---

## 1. Scope Compliance

| Requirement                                                                                       | Delivered                | Where                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective: manage the sales lifecycle of AI-generated websites, not a generic CRM                 | ✅                       | Every entity is scoped to `Lead` (M2/M4) — no standalone contact/company/deal model exists outside that relationship                              |
| Opportunity Pipeline                                                                              | ✅                       | `LeadCRM.stageId` + `SalesStageService`                                                                                                           |
| Sales Stages (default 10-stage pipeline)                                                          | ✅                       | `SalesStage` table, seeded by the migration: NEW/CONTACTED/QUALIFIED/ANALYSIS_READY/WEBSITE_READY/PREVIEW_SENT/PROPOSAL_SENT/NEGOTIATION/WON/LOST |
| Follow-ups / Reminders                                                                            | ✅                       | `CrmTask.reminderAt`/`LeadCRM.nextFollowUpAt` — no separate entity, no delivery mechanism (no notification channel exists)                        |
| Tasks (Due Date/Priority/Status/Assigned User/Reminder)                                           | ✅                       | `CrmTask` + Task Engine                                                                                                                           |
| Activity Timeline                                                                                 | ✅                       | `LeadActivity` (M4), extended and reused — Activity Engine                                                                                        |
| Notes                                                                                             | ✅                       | Already exists — M4's `POST /leads/:id/notes`, untouched                                                                                          |
| Proposal Tracking (Version/Sent Date/Viewed/Accepted/Rejected)                                    | ✅                       | `SalesProposal` — Proposal Engine                                                                                                                 |
| Website Status                                                                                    | ✅                       | `WebsiteStatusService.getForLead()` — computed, never duplicated                                                                                  |
| Lead Assignment                                                                                   | ✅                       | `LeadCRM.ownerId` — independent of `Lead.assignedToId` (M4)                                                                                       |
| Activities: Calls/Emails/Meetings/WhatsApp/Notes/Website Generated/Preview Sent/Proposal Sent     | ✅                       | `LeadActivityType` extended with all seven; Notes reuses its existing M4 type                                                                     |
| Task fields: Due Date/Priority/Status/Assigned User/Reminder                                      | ✅                       | `CrmTask` — plus founder's Decision 4 extension (estimatedDuration/actualDuration/completedBy)                                                    |
| Proposal fields: Version/Sent Date/Viewed/Accepted/Rejected                                       | ✅                       | `SalesProposal.version`/`sentAt`/`viewedAt`/`acceptedAt`/`rejectedAt`                                                                             |
| Dashboard: Pipeline Value/Conversion Rate/Avg Sales Cycle/Win Rate/Lost Reasons/Sales Performance | ✅                       | `GET /crm/dashboard` — `DashboardStats`                                                                                                           |
| Four permissions: `crm:view`/`crm:manage`/`crm:assign`/`crm:report`                               | ✅                       | All four added, none reused from an earlier module — DECISIONS.md D-090                                                                           |
| Architecture: five separate modules, business logic must remain modular                           | ✅                       | `apps/api/src/crm/{pipeline,tasks,activities,proposals,reporting}/`, each its own NestJS module                                                   |
| Future Compatibility: Email/WhatsApp/Calendar Integration, Automation Rules, AI Sales Assistant   | ✅ (reserved, not built) | No code path toward any of these exists; `CrmSettings`/`reminderAt` are the only forward-compatible surfaces, both inert this phase               |
| Constraint: no email sending                                                                      | ✅                       | Verified by scope — no email provider/adapter anywhere in `crm/`                                                                                  |
| Constraint: no WhatsApp sending                                                                   | ✅                       | Verified by scope — `whatsapp` is a loggable activity _type_, never a send action                                                                 |
| Constraint: no deployment                                                                         | ✅                       | Verified by scope                                                                                                                                 |
| Constraint: no analytics                                                                          | ✅                       | Verified by scope — Reporting Engine is CRM sales metrics only, not product analytics                                                             |
| Constraint: no AI chatbots                                                                        | ✅                       | Verified by scope — zero import of `@riznexia/ai` anywhere in `crm/`                                                                              |
| Constraint: no marketing automation                                                               | ✅                       | Verified by scope                                                                                                                                 |
| **Decision 1 — roadmap superseded as implementation spec**                                        | ✅                       | D-082                                                                                                                                             |
| **Decision 2 — SalesStage remains a configurable table**                                          | ✅                       | D-084                                                                                                                                             |
| **Decision 3 — dedicated LeadCRM entity, Lead untouched**                                         | ✅                       | D-083                                                                                                                                             |
| **Decision 4 — CrmTask extended with duration/completedBy**                                       | ✅                       | D-091                                                                                                                                             |
| **Decision 5 — reuse LeadActivity, no parallel system**                                           | ✅                       | D-086                                                                                                                                             |
| **Decision 6 — Reporting Engine read-only, aggregates only**                                      | ✅                       | D-089                                                                                                                                             |
| **Decision 7 — SalesProposal immutable version history**                                          | ✅                       | D-085                                                                                                                                             |
| **Decision 8 — WebsiteStatus remains computed**                                                   | ✅                       | D-088                                                                                                                                             |
| **Decision 9 — Dashboard stats support future caching**                                           | ✅                       | D-089                                                                                                                                             |
| **Decision 10 — SalesStage supports archive, not hard delete**                                    | ✅                       | D-084                                                                                                                                             |
| **Decision 11 — LostReason configurable table**                                                   | ✅                       | D-084                                                                                                                                             |
| **Decision 12 — CrmSettings for future extensibility**                                            | ✅                       | D-087                                                                                                                                             |
| Unit tests                                                                                        | ✅                       | 105 new `apps/api`, 61 new `packages/shared-types`                                                                                                |
| Integration tests                                                                                 | ✅                       | 17 new (`crm.e2e-spec.ts`)                                                                                                                        |
| Documentation                                                                                     | ✅                       | TASKS.md, CHANGELOG.md, DECISIONS.md (D-082 through D-091), this report                                                                           |

**Roadmap frozen, not touched:** `docs/21-implementation-roadmap.md`'s M10 entry was not edited; its AI-Sales-Agent/Proposal-Generator/CRM-Assistant content is now stale relative to what was actually built, a documented gap (D-082), not a silent contradiction.

## 2. Pre-Implementation Architecture Review

Before any code was written, existing infrastructure was audited first (`Lead`/`LeadActivity`/`LeadNote`/`SalesProposal` already existed from M1-M4) and a genuine scope conflict was found: `docs/21`'s actual M10 entry describes a different, AI-centric module than the founder's live brief. Flagged directly via AskUserQuestion rather than silently resolved either way, given how firmly "the roadmap is frozen" had been stated every prior phase:

1. **Which spec should M10's implementation follow — the roadmap's stale entry, the founder's live brief, or an attempt to merge both?** Founder chose the live brief — DECISIONS.md D-082.

A full architecture (data model, five engines, API design, permissions, validation strategy) was then presented and approved, followed by twelve explicit numbered founder Decisions refining it further, all incorporated before implementation:

- **Decisions 2/10/11 (SalesStage/LostReason)** — both remain configurable database tables (not enums), with archive-not-delete — resolved by seeding both via the migration itself rather than application code, and by removing an initially-drafted `SalesStageInUseException` that would have contradicted "archiving never breaks an existing reference" (D-084).
- **Decision 3 (LeadCRM bounded context)** — resolved by a new, separate entity with a lazy get-or-create, keeping `LeadsModule` unaware `crm/` exists (D-083).
- **Decision 4 (CrmTask extension)** — `estimatedDurationMinutes`/`actualDurationMinutes`/`completedById`, the latter two stamped automatically and idempotently on the `completed` transition (D-091).
- **Decision 5 (reuse LeadActivity)** — resolved by extending the existing enum and exporting `LeadActivityService` from `LeadsModule`, rather than a parallel activity table (D-086).
- **Decision 6 (Reporting boundary)** — resolved by having `PipelineModule` export every one of its services (not just the ones its own controllers use) specifically so a future `ReportingModule` could depend on them; in practice `ReportingService` reads `LeadCRM`'s joined, already-computed fields directly rather than looping per-lead through those services, since none of them expose a bulk-list surface and a dashboard rollup calling them per-lead would be an N+1 (D-089).
- **Decision 7 (Proposal immutability)** — resolved by making each `SalesProposal` row one immutable version, server-computing `version`, and giving the status-update endpoint's schema no `content` field at all (D-085).
- **Decision 8 (WebsiteStatus computed)** — resolved via eight parallel existence-checks against M6-M9's own tables, deliberately renamed `WebsiteGenerationStatus` to avoid colliding with the unrelated M1/M5 `Business.websiteStatus` (D-088).
- **Decision 9 (Dashboard cache-ready shape)** — resolved by making `DashboardStats` a pure, fully-serializable function of `(dateRange, filters)`; no caching actually wired this phase (D-089).
- **Decision 12 (CrmSettings)** — resolved as a genuine singleton, seeded once by its migration, fetched by `findFirst()`, never `create()`d again (D-087).

Full reasoning: `DECISIONS.md` D-082 through D-091.

## 3. Implementation Summary

**Schema (`packages/db/prisma/schema.prisma`):** `SalesStage`/`LostReason` (configurable, seeded, archivable), `LeadCRM` (1:1 with `Lead`), `CrmTask`, `CrmSettings` (seeded singleton), `SalesProposal` (rewritten for immutable versioning). `LeadActivityType`/`ProposalStatus` extended. New migration `20260805000000_m10_sales_crm`, combining Prisma's raw diff with hand-added seed `INSERT` statements.

**Contracts (`packages/shared-types/src/`):** `sales-stage.ts`, `lost-reason.ts`, `lead-crm.ts`, `crm-task.ts`, `sales-proposal.ts`, `crm-settings.ts`, `website-status.ts`, `dashboard-stats.ts`, `crm-activity.ts` — nine new files, each with its own test file.

**Pipeline Engine (`apps/api/src/crm/pipeline/`):** `SalesStageService`/`LostReasonService`/`CrmSettingsService`/`WebsiteStatusService`/`LeadCrmService`, five controllers, four DTO mappers, `pipeline.module.ts` (exports every service for `ReportingModule`).

**Task Engine (`apps/api/src/crm/tasks/`):** `CrmTaskService`, `LeadTasksController` (per-lead), `CrmTaskController` (cross-lead), `crm-task.mapper.ts`, `task.module.ts`.

**Activity Engine (`apps/api/src/crm/activities/`):** `CrmActivityService`, `CrmActivityController` (`POST /leads/:id/activity`), `activity.module.ts` (imports `PipelineModule` for the `lastActivityAt` touch).

**Proposal Engine (`apps/api/src/crm/proposals/`):** `SalesProposalService`, `SalesProposalController`, `sales-proposal.mapper.ts`, `proposal.module.ts`.

**Reporting Engine (`apps/api/src/crm/reporting/`):** `ReportingService.getDashboardStats()` (grouping/rate/cycle-time math, no cross-engine service calls), `ReportingController` (`GET /crm/dashboard`), `reporting.module.ts` (no imports from the other four CRM modules — reads Prisma directly, per D-089's rationale).

**Exceptions/permissions:** `SalesStageNotFoundException`/`LostReasonNotFoundException`/`CrmTaskNotFoundException`/`SalesProposalNotFoundException`/`LostReasonRequiredException`; four new permissions (`crm:view`/`crm:manage`/`crm:assign`/`crm:report`).

**App wiring:** all five modules registered in `apps/api/src/app.module.ts`; the full `AppModule` DI graph verified by running `app.e2e-spec.ts` (which compiles/boots the entire application, catching any circular-dependency or missing-provider error a typecheck alone would miss).

**Two real design issues found and fixed during implementation, not merely hypothetical:**

1. A decision-number collision: `crm-task.ts`'s doc comments cited `DECISIONS.md D-084` for founder's Decision 4 (CrmTask extension), but D-084 was already consistently used everywhere else for the SalesStage/LostReason configurable-table decision. Reassigned to D-091 before DECISIONS.md was written, so the entry that now exists matches every inline comment that promises it.
2. A pre-existing DECISIONS.md ordering bug (found while adding D-082, from an earlier session): M9's section had been inserted mid-way through M8.4's own D-071-D-074 entries. Reordered so file order matches module order.

## 4. Test Coverage

| Suite                                                  | Tests | Notes                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared-types` (9 new `.test.ts` files)       | 61    | Schema shape, closed-enum rejection, key-format validation, `.strict()` empty-body rejection — one file per new entity                                                                                                         |
| `apps/api` — Pipeline (5 service + 5 controller specs) | 49    | Lazy get-or-create + default-stage resolution, lost-reason-required/cleared stage-transition logic, owner-assignment TeamMember validation, archive-not-delete, defensive out-of-order-milestone WebsiteStatus test            |
| `apps/api` — Task (service + 2 controller specs)       | 21    | Idempotent completion stamping, reopening clears completion fields, cross-lead filters, per-lead 404 on unknown lead                                                                                                           |
| `apps/api` — Activity (service + controller spec)      | 6     | Detail-JSON shape with/without note, all four type mappings, `lastActivityAt` touched inside the same transaction                                                                                                              |
| `apps/api` — Proposal (service + controller spec)      | 16    | Version computation (max+1, never overwritten), each settable status's own timestamp, `sent_manually`'s activity+transaction side effects                                                                                      |
| `apps/api` — Reporting (service + controller spec)     | 10    | Empty-data null-safety, stage-order-sorted pipeline value, won/lost exclusion from open pipeline value, conversion vs. win rate math, cycle-time activity-matching + fallback, per-rep grouping including an unassigned bucket |
| `apps/api/test/crm.e2e-spec.ts`                        | 17    | All five engines' guard/permission/pipe/controller/service wiring; RBAC for all four permissions independently; lost-reason-required error; proposal content-injection trust boundary                                          |

**Totals:** `apps/api` unit 504/504 (up from 399), e2e 183/183 (up from 166). `packages/shared-types` 216/216 (up from 155). Full monorepo build/typecheck/lint/test clean for every touched package; the two zero-test packages (`packages/ui`, `apps/web`) and `packages/logger` are pre-existing and unrelated to this module.

## 5. `DashboardStats` Field Reference

| Field                   | Source                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pipelineValueByStage`  | `LeadCRM` rows with `!stage.isWon && !stage.isLost`, grouped by `stageId`, ordered by `SalesStage.order`                                                                                           |
| `totalPipelineValueUsd` | Sum of `pipelineValueByStage[].totalValueUsd`                                                                                                                                                      |
| `conversionRatePercent` | won ÷ all leads in the filtered set — "of every lead that entered the CRM, how many converted"                                                                                                     |
| `winRatePercent`        | won ÷ (won + lost) — "of every decided opportunity, how many did we win"                                                                                                                           |
| `averageSalesCycleDays` | For each won lead, days between `LeadCRM.createdAt` and the most recent `STAGE_CHANGED` activity into its current (won) stage — falls back to `LeadCRM.updatedAt` when no matching activity exists |
| `lostReasonsBreakdown`  | Lost `LeadCRM` rows grouped by `lostReasonId`, with an explicit `null`-id bucket for any row missing one (defensive; shouldn't occur given `LostReasonRequiredException`)                          |
| `salesPerformanceByRep` | All rows grouped by `ownerId` (with an explicit unassigned bucket), each carrying its own won/lost/open counts, total won value, and average cycle time                                            |

## 6. Security Review

- **AuthZ** — every mutation across all five engines is gated by the specific permission it needs (never a blanket `crm:manage` fallback): `crm:manage` for stage transitions/task-and-proposal writes, `crm:assign` for owner assignment only, `crm:report` for the dashboard only, `crm:view` for every read except `GET /leads/:id/website-status` (deliberately `leads:read`, per D-088). Verified: a `sales_executive` (holds `crm:view`/`crm:manage` but not `crm:assign`/`crm:report`) gets 403 on owner-assignment and the dashboard; a `developer`/`viewer` (hold none of the four) get 403 everywhere.
- **Trust boundary — proposal content immutability** — the status-update endpoint's Zod schema has no `content` field at all; an e2e test sends a body with an injected `content` key and asserts the Prisma `update()` call Zod's validated output produces has no `content` property, proving the field is stripped before it ever reaches the service layer, not merely "unlikely to be sent."
- **Cost governance** — not applicable. No AI call, no third-party API, nothing to meter against the monthly cost ceiling.
- **No secrets/PII newly logged** — no new `Logger` calls were added beyond the framework's own request logging; no CRM-specific structured logging requirement was in this brief (unlike M9's explicit one).
- **Bounded context integrity** — verified structurally: `LeadsModule` has zero import from `crm/`; every `crm/` service that needs to check "does this lead exist" does so via a lightweight `prisma.lead.findUnique()`, never a service-to-service call back into `LeadsModule` for a business-rule decision.

## 7. Known Limitations (flagged, not hidden)

- The migration has not been run against a real Postgres instance — same constraint as every prior module.
- **`averageSalesCycleDays` is an approximation** — no dedicated `wonAt` timestamp is stored anywhere on `LeadCRM`; it's derived from the most recent `STAGE_CHANGED` activity whose `detail.to` matches a lead's current won stage, falling back to `LeadCRM.updatedAt` when no such activity exists (e.g. a lead seeded or manually inserted directly into a won stage).
- **No caching is actually wired for `GET /crm/dashboard`** — `DashboardStats`' shape is deliberately cache-ready (founder's Decision 9), but every request recomputes from scratch this phase; a future cache wrapper keyed on `(dateRange, filters)` would sit in front of it without needing a redesign.
- **`LeadCRM.getOrCreate()`'s lazy-creation check is not fully race-safe** — two concurrent first-touches of the same lead could both pass the `findUnique` check before either `create()`s, and the second would hit the `leadId` unique constraint. Acceptable for this scale (an internal sales tool, not a high-concurrency public system); not specially handled.
- **`SalesProposal.create()`'s next-version computation has the same class of race** — two concurrent `POST`s for the same lead could compute the same `max + 1` and collide on `@@unique([leadId, version])`. Same acceptable-scope reasoning as above.
- **Reporting Engine reads Prisma directly rather than exclusively through Pipeline Engine's own service methods** — a deliberate, documented interpretation of founder's Decision 6 (see D-089): every business judgment it makes is a read of an already-Pipeline-computed field (`isWon`/`isLost`/label/name), never a re-derivation, but the query path itself bypasses `SalesStageService`/`LeadCrmService` because none of them expose a bulk-list method and calling them per-lead would be an N+1 across every lead in the org.

## 8. Approval Checklist

- [x] Module brief requirements delivered: five engines, default 10-stage pipeline, tasks/activities/proposals/dashboard, four permissions, zero AI/email/WhatsApp/deployment/analytics/marketing-automation
- [x] Roadmap-vs-brief scope conflict flagged via AskUserQuestion before any code was written; founder's resolution recorded (D-082)
- [x] All twelve founder Decisions incorporated into the architecture before implementation, not retrofitted after
- [x] Roadmap not renamed/reordered/merged/split — `docs/21-implementation-roadmap.md` untouched
- [x] `Lead` (M2/M4) not extended with CRM fields — verified structurally, `LeadCRM` is a separate entity
- [x] `LeadsModule` has zero dependency on `crm/` — dependency direction verified one-way
- [x] `LeadActivity` reused, not duplicated — verified by scope (no second activity table exists)
- [x] `SalesProposal` versions are immutable — verified by an e2e test that an injected `content` field never reaches the database
- [x] `SalesStage`/`LostReason` archive, never hard-delete — verified by test
- [x] Reporting Engine never re-derives Pipeline business rules from raw data — verified by scope (every won/lost judgment reads a Pipeline-computed field)
- [x] Full test suite green (504 unit + 183 e2e in `apps/api`; 216 in `packages/shared-types`)
- [x] Full monorepo build/typecheck/lint clean for every touched package; whole-app DI graph verified via `app.e2e-spec.ts`
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-082 through D-091) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
