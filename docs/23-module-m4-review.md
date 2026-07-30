# Module Review Report — M4: Lead Management APIs

**Status:** Implementation complete, pending founder approval
**Date:** 2026-07-30
**Reviewed against:** `docs/21-implementation-roadmap.md` (frozen roadmap, M1–M12), Module brief for M4

---

## 1. Scope Compliance

| Requirement                | Delivered                     | Where                                                            |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| Create Lead                | ✅                            | `POST /leads`                                                    |
| Get Lead by ID             | ✅ (unchanged from M1)        | `GET /leads/:id`                                                 |
| Update Lead                | ✅                            | `PATCH /leads/:id`                                               |
| Soft Delete Lead           | ✅                            | `DELETE /leads/:id`                                              |
| List Leads                 | ✅ (extended from M1)         | `GET /leads`                                                     |
| Assign lead to a user      | ✅                            | `PATCH /leads/:id` `assignedTo`                                  |
| Update lead status         | ✅                            | `PATCH /leads/:id` `pipelineStage`                               |
| Add internal notes         | ✅                            | `POST/GET /leads/:id/notes` (append-only, authored)              |
| Add tags                   | ✅                            | `PATCH /leads/:id` `tags`, `Lead.tags` (Postgres array)          |
| Record activity history    | ✅                            | `LeadActivity` table, `GET /leads/:id/activity`                  |
| Search                     | ✅ (unchanged from M1)        | `?q=` on business name                                           |
| Filtering                  | ✅ (extended)                 | `stage`, `city`, `category`, `assignedTo`, `tag`                 |
| Sorting                    | ✅ (new)                      | `?sort=field`/`-field`, whitelisted                              |
| Pagination                 | ✅ (unchanged from M1)        | cursor-based                                                     |
| Clerk authentication       | ✅ (unchanged)                | `ClerkAuthGuard`                                                 |
| Existing RBAC              | ✅ (unchanged permission set) | `@RequirePermissions('leads:read'/'leads:write'/'leads:delete')` |
| Audit all write operations | ✅                            | `@Audited()` on every write route                                |
| Input validation           | ✅                            | zod schemas, `packages/shared-types`                             |
| Error handling             | ✅                            | 5 new typed exceptions, Doc 19 §4 error codes                    |
| Structured logging         | ✅                            | `Logger`, matching `DiscoveryRunnerService` convention           |
| Unit tests                 | ✅                            | 60 new/updated (241 total in `apps/api`)                         |
| Integration tests          | ✅                            | 29 new (`leads.e2e-spec.ts`, 71 e2e total)                       |

**Constraints honored:** no Google Places sync code, no AI analysis code, no frontend code, no CRM dashboard code. Verified by `git diff` scope (touches only `packages/db`, `packages/shared-types`, `apps/api`) and by the module's own test suite never exercising anything outside those packages.

**Roadmap frozen, not touched:** `docs/21-implementation-roadmap.md`'s module list, order, and numbering are unchanged. Only M4's own **Status**/**Tasks**/**Risks**/**Testing Strategy**/**Definition of Done** fields were updated to reflect what was actually delivered — the same treatment M3's entry got after that module shipped. No module was renamed, reordered, merged, or split.

**Not delivered, by explicit instruction:** the pipeline list/kanban UI and global `/search` endpoint+UI that Doc 21's _original_ M4 task list also named. The brief for this pass was explicit ("Do NOT implement frontend"), so this is the backend API only. Flagged in `docs/21` and `TASKS.md` rather than silently redefining the module's Definition of Done to match only what shipped — M4 is not fully "done" against its original roadmap DoD until a UI exists.

## 2. Pre-Implementation Architecture Review

Per the brief's explicit instruction, the current architecture was reviewed before any code was written, checking the requested feature set against the frozen Module M2 schema and Module M3 RBAC. Four genuine conflicts surfaced — none of them guessed at; all four resolved via `AskUserQuestion` before implementation started:

1. **Lead creation shape.** M2 made `Lead.businessId` a required, unique FK — there's no "standalone lead" in the schema. _Resolved:_ `POST /leads` references an existing `businessId`. Manual business entry (BRD §9's fallback) was explicitly declined for this module — it's Module M5's territory (`Business.googlePlaceId` would need to tolerate null), and the roadmap is frozen.
2. **Notes model.** M2's `Lead.notes` was a single overwritable string, no author. "Add notes" is additive. _Resolved:_ new `LeadNote` table, append-only, author-attributed. Migration backfills existing content before dropping the column.
3. **Tags.** No tag support existed. _Resolved:_ `Lead.tags String[]` + GIN index, not normalized `Tag`/`LeadTag` tables — covers every stated requirement without machinery the brief didn't ask for.
4. **Activity history vs. `audit_log`.** M3 already built a security audit trail. _Resolved:_ separate `LeadActivity` table — different consumer (rep-facing timeline vs. admin security trail), different content (no IP addresses), different vocabulary (closed enum vs. open audit-log string).

Full reasoning for each: `DECISIONS.md` D-030 through D-032.

Two things were surfaced and flagged rather than silently resolved:

- Assignment has no permission distinct from `leads:write` — consistent with Doc 15 §2's already-documented org-wide lead visibility, not an oversight.
- M4's _backend_ Definition of Done is met; the roadmap entry's _original_ (pre-this-brief) DoD included UI, which this pass explicitly excludes.

## 3. Implementation Summary

**Schema (`packages/db/prisma/schema.prisma`, migration `20260730000000_m4_lead_management`):**

- `Lead.tags String[] @default([])` + GIN index; `Lead.notes` dropped after backfill.
- `LeadNote` (append-only, `authorId` nullable/`SET NULL`).
- `LeadActivity` + `LeadActivityType` enum (`CREATED`, `STAGE_CHANGED`, `ASSIGNED`, `UNASSIGNED`, `NOTE_ADDED`, `TAGS_CHANGED`, `DELETED`).
- Migration hand-authored (no live database in this environment, same constraint as D-020/D-024) and cross-checked against a `prisma migrate diff --from-empty` render of the final schema.

**Contracts (`packages/shared-types/src/lead.ts`):** `createLeadSchema`, `updateLeadSchema` (`.strict().refine()` — rejects empty bodies and unknown keys), `createLeadNoteSchema`, `leadNoteSchema`, `leadActivitySchema`, `LEAD_SORT_FIELDS`, tag validation (lowercased, length/count-capped).

**Services (`apps/api/src/leads/`):**

- `LeadsService` — `create`/`update`/`softDelete` all transaction-wrapped with the corresponding `LeadActivity` write(s); `update` diffs before/after state and writes one activity row per field that actually changed (a multi-field PATCH produces multiple timeline entries, not one vague "updated"); `findMany` extended with `sort`/`tag`; `ensureForBusiness` (discovery's write path) unchanged in contract.
- `LeadActivityService` — transaction-aware recorder (propagates failures, unlike the best-effort `AuditLogService`) + paginated reader.
- `LeadNotesService` — append-only create + paginated reader, both 404 on an unknown/soft-deleted lead rather than returning an empty list.

**Controller (`apps/api/src/leads/leads.controller.ts`):** 8 routes total (2 from M1, 6 new). Per-route `@RequirePermissions()`; `@Audited()` on every write route including note creation.

**Logging:** `Logger` added to `LeadsService`/`LeadNotesService`, logging every successful mutation and one `warn` case (a PATCH that changed nothing meaningful) — same pattern already established by `DiscoveryRunnerService`.

## 4. Test Coverage

| Suite                                    | Tests | Notes                                                                                                                                        |
| ---------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared-types` (`lead.test.ts`) | 41    | Contract validation incl. tag rules, PATCH empty-body/unknown-key rejection, null-vs-omitted `assignedTo`                                    |
| `leads.service.spec.ts`                  | 32    | CRUD, workflow, sort/filter, activity diffing, `ensureForBusiness` regression                                                                |
| `leads.controller.spec.ts`               | 9     | Delegation + actor-id wiring for every route                                                                                                 |
| `lead-activity.service.spec.ts`          | 9     | Transaction-vs-root-client writes, pagination, 404 on unknown lead                                                                           |
| `lead-notes.service.spec.ts`             | 6     | Same, plus author attribution                                                                                                                |
| `lead-activity.mapper.spec.ts`           | 8     | Round-trip enum mapping                                                                                                                      |
| `apps/api/test/leads.e2e-spec.ts`        | 29    | Full HTTP-level CRUD/workflow, the complete RBAC permission matrix (every role tested against every write route), validation, audit-on-write |

**Totals:** `apps/api` unit 241/241 passing (up from 198), e2e 71/71 passing (up from 42). Full monorepo typecheck/lint/build clean. Compiled server boots; all 8 `/leads*` routes map correctly.

## 5. Security Review

- **AuthN unchanged** — Clerk remains the sole authentication provider (no code touched here).
- **AuthZ** — every route permission-gated using Module M3's _existing_ permission set (`leads:read`/`leads:write`/`leads:delete`); no new permissions were added, none needed.
- **RBAC matrix verified empirically**, not just asserted: `leads.e2e-spec.ts` exercises every role (`viewer`, `developer`, `sales_executive`, `sales_manager`, `admin`, `super_admin`) against write/delete routes and confirms the actual 403/2xx split matches `permission.constants.ts`.
- **Audit trail** — every write route (create, update, delete, note-add) is `@Audited()`; verified in both unit and e2e tests that `audit_log` receives a row with the correct `action`/`entityId`.
- **Input validation** — every mutation body is zod-validated before reaching business logic; tag values are format/length/count-bounded (defends against unbounded array growth and near-duplicate tags); UUID path params use `ParseUUIDPipe`.
- **IDOR consideration reviewed, not newly introduced:** any role with `leads:write` can reassign a lead to any team member and read/write any lead — this is Module M1/M3's already-documented "org-wide visibility, deliberate simplification for a small internal team" (Doc 15 §2), not a new gap opened by this module.
- **No secrets/PII newly logged** — log lines carry only UUIDs (lead/actor IDs) and enum values, consistent with Doc 15 §3/§7.

## 6. Known Limitations (flagged, not hidden)

- The migration (including the `leads.notes` → `lead_notes` backfill) has not been run against a real Postgres instance — this environment has no live database, same constraint as every prior module's migration (D-020, D-024).
- Pipeline list/kanban UI and the global `/search` endpoint+UI are not built (explicit instruction). M4's original roadmap Definition of Done is only partially met until they exist.
- Assignment is not restricted by target role or team membership — any `leads:write` holder can assign to anyone. Consistent with existing product philosophy, not a defect, but worth the founder's explicit confirmation as the module set grows (especially ahead of Module M10, Sales CRM).
- `LeadActivity`'s `detail` JSON is intentionally loose-typed (`Prisma.InputJsonValue` in, `Record<string, unknown> | null` out) — sufficient for M4's own use, may need firmer per-type shapes if M10 builds a rich timeline UI against it.

## 7. Approval Checklist

- [x] Architecture reviewed before implementation; conflicts surfaced and resolved with the founder, not guessed at
- [x] Roadmap not renamed/reordered/merged/split — only M4's own status fields updated
- [x] All stated requirements delivered (backend scope) or explicitly flagged as excluded
- [x] All stated constraints honored (no Places sync, no AI, no frontend, no CRM dashboard)
- [x] Full test suite green (241 unit + 71 e2e in `apps/api`; 41 in `packages/shared-types`)
- [x] Full monorepo typecheck/lint/build clean; compiled server boots
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md updated
- [x] Self-review complete, this report generated

**Awaiting founder approval before Module M5.**
