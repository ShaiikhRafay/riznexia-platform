# Implementation Roadmap — Riznexia AI Sales Platform

**Status:** Draft — implementation planning deliverable
**Last updated:** 2026-07-27

> **Scope note:** Breaks Doc 10's 8 phases into 12 buildable modules, each with GitHub milestones/issues and a sprint plan. No code — this is planning only.
>
> **"Independently deployable" clarification:** Doc 16 §3 establishes a **modular monolith** — one NestJS process, one Next.js app — not separate microservices per module. "Independently deployable" here means each module ships as a **complete, working vertical slice that can merge to `main` and go to production on its own**, without waiting for other unfinished modules to be ready (Doc 11's trunk-based, continuous-deploy model already supports this). It does not mean each module runs as its own hosted service. Flag if you actually intended physically separate services — that would change Doc 16's architecture decision, not just this roadmap.

---

## 1. Module Breakdown

### M0 — Platform Foundation

| Field | Detail |
|---|---|
| Objective | Stand up the monorepo, CI/CD, infra, and auth/RBAC so every other module has something to build on |
| Dependencies | None — first module |
| Tasks | Initialize Turborepo/pnpm monorepo (Doc 05); provision Neon, Railway, Vercel, Upstash Redis, Cloudflare R2, GitHub org, Trigger.dev; implement Prisma schema (Doc 18) + initial migration; Clerk integration + domain-restricted login; global auth/role guards (Doc 16 §6, §15); CI pipeline (lint/typecheck/test/build gates); `packages/logger` + Sentry wiring |
| Estimated Time | 2 engineer-weeks |
| Priority | P0 — blocks everything |
| Risks | Infra account setup/access approval friction can silently stall the whole team — front-load account creation on Day 1 |
| Testing Strategy | Integration tests for auth/role guards (100% branch coverage, Doc 13 §3); CI pipeline validated by intentionally breaking a check once |
| Definition of Done | A developer can clone, run `pnpm dev`, sign in via Clerk, hit a protected `/me` endpoint, and see correct role-based access in a deployed preview environment |

### M1 — Lead Discovery

| Field | Detail |
|---|---|
| Objective | Let a rep run a discovery search and get back real, qualified leads |
| Dependencies | M0 |
| Tasks | Places API adapter + Lead Finder Agent (Doc 20 §4); Website Checker Agent incl. AI-fallback tier (Doc 20 §5); `discovery-jobs`/`leads` endpoints (Doc 19); Discovery screen UI (Doc 17 §9); Redis-backed result caching (Doc 16 §10) |
| Estimated Time | 1.5 engineer-weeks |
| Priority | P0 |
| Risks | Google Places data quality/coverage varies by region (BRD risk) — test against 2–3 real target cities early, not synthetic data |
| Testing Strategy | Unit tests on the outdated-website heuristic against real+synthetic site fixtures; integration test for dedupe-by-place-id |
| Definition of Done | PRD FR-1.1–FR-1.6 pass; a rep runs a real search against a live city and sees qualified leads appear |

### M2 — Lead Pipeline / CRM

| Field | Detail |
|---|---|
| Objective | Give reps and managers a working day-to-day pipeline |
| Dependencies | M0 (can build in parallel with M1 against fixture leads) |
| Tasks | Lead CRUD + PATCH (stage/assignment/notes); pipeline list/kanban UI; global `/search` endpoint + UI; audit-logging hooks on stage-change events (Doc 18 §6) |
| Estimated Time | 1.5 engineer-weeks |
| Priority | P0 |
| Risks | Kanban drag-and-drop UX can balloon scope — timebox: functional list+filter view first, kanban as a stretch goal within the sprint |
| Testing Strategy | Integration tests for stage transitions and role-authorization on mutation endpoints |
| Definition of Done | PRD FR-2.1–FR-2.4 pass; a manager sees the whole team's pipeline, filters/sorts it, reassigns a lead |

### M3 — Business Intelligence

| Field | Detail |
|---|---|
| Objective | Turn a qualified lead's raw data into a usable brand brief |
| Dependencies | M1, M2 (needs real qualified leads) |
| Tasks | `AiService` gateway scaffolding (Doc 16 §7) — provider adapters, prompt registry, cost-tracker middleware; Business Analyzer Agent (Doc 20 §6); `/leads/{id}/business` endpoint + UI tab (Doc 17 §10); output validation + guardrails (Doc 09 §5) |
| Estimated Time | 1 engineer-week (gateway groundwork cost-shared with M4) |
| Priority | P0 |
| Risks | Hallucinated business facts (Doc 09 §7) — mitigated by structured input delimiting + fact-grounding prompt constraints |
| Testing Strategy | AI regression eval harness against golden business fixtures (Doc 13 §2); schema-validation unit tests |
| Definition of Done | PRD FR-3.1–FR-3.2 pass; analysis is visibly grounded in real review/photo data on a live test lead |

### M4 — AI Generation Core

| Field | Detail |
|---|---|
| Objective | Generate a complete, business-specific demo website's content and brand kit |
| Dependencies | M3 (shares gateway groundwork; can start once the gateway skeleton exists) |
| Tasks | Theme Selector Agent (Doc 20 §7); Content Writer Agent, per-page (Doc 20 §8); SEO Agent (Doc 20 §9); Image Optimizer Agent incl. alt-text (Doc 20 §10); Website Generator Agent — deterministic assembly (Doc 20 §11); category templates in `apps/site-template`, starting with 1–2 categories |
| Estimated Time | 2.5 engineer-weeks — the largest single module |
| Priority | P0 |
| Risks | Runaway AI cost from indiscriminate generation (mitigated by the Qualified-stage gate + cost ceilings, already designed); template scope creep — ship 1–2 categories fully before adding more |
| Testing Strategy | AI regression eval harness per agent; contrast/validation unit tests for Theme Selector; snapshot tests for Website Generator's deterministic assembly |
| Definition of Done | PRD FR-4.1–FR-4.8 pass; a full demo (all pages, brand kit, images) generates end-to-end within the <5 min target |

### M5 — Website Preview & Generator UI

| Field | Detail |
|---|---|
| Objective | Let a rep watch generation happen and review the result before deploying |
| Dependencies | M4 |
| Tasks | Pipeline stepper UI (Doc 17 §13); live preview iframe pane; regenerate-by-instruction control (the only content-adjustment path, Doc 12 §3); generation job status polling |
| Estimated Time | 1.5 engineer-weeks |
| Priority | P0 |
| Risks | Accidental-editor-creep (Doc 12 §3) — reviewed explicitly in PR review for this module |
| Testing Strategy | E2E test (Playwright) covering generate → preview → regenerate-section |
| Definition of Done | PRD FR-4.7, FR-5.1–FR-5.2 pass; a rep watches a real generation run stage-by-stage and regenerates one section without touching code |

### M6 — Deployment

| Field | Detail |
|---|---|
| Objective | Get a reviewed demo live at a real URL |
| Dependencies | M5 |
| Tasks | GitHub adapter (repo create/update); Vercel adapter (project create/update, deploy trigger); Deployment Agent (Doc 20 §12); `/websites/{id}/deployments` endpoints + webhook ingestion; deployment status UI (Doc 17 §12) |
| Estimated Time | 1.5 engineer-weeks |
| Priority | P0 |
| Risks | Vercel/GitHub rate limits or account governance issues at higher demo volume — mitigated by the naming/tagging convention (Doc 04 §6) from day one |
| Testing Strategy | Scheduled staging smoke test against the real GitHub+Vercel integration (Doc 13 §4); idempotency tests on repeated deploy calls |
| Definition of Done | PRD FR-6.1–FR-6.5 pass; a real demo deploys and is reachable at a live public URL from a real staging run |

### M7 — Sales & Outreach

| Field | Detail |
|---|---|
| Objective | Give reps AI-drafted pitch content tied to the live demo |
| Dependencies | M3 (brand brief); M6 (live URL — though Sales Agent can draft pre-deploy too) |
| Tasks | Sales Agent (Doc 20 §13); Proposal Generator (Doc 20 §14); Proposals UI |
| Estimated Time | 1 engineer-week |
| Priority | P1 — high-value, not blocking the core discover→demo→deploy spine |
| Risks | Draft quality perceived as generic — mitigated by grounding in the same `brand_brief` used for site content |
| Testing Strategy | Explicit "no auto-send path exists" test (Doc 13 §4) — a trust-boundary test, not just a feature test |
| Definition of Done | PRD FR-8.1–FR-8.2 pass; a rep gets a usable, business-specific draft |

### M8 — CRM Assistant

| Field | Detail |
|---|---|
| Objective | Reduce time-to-context when a rep picks up or reviews a lead |
| Dependencies | M2 (needs pipeline/notes data to summarize) |
| Tasks | CRM Assistant agent (Doc 20 §15); on-demand summarize endpoint + UI trigger; daily stale-lead sweep (scheduled Trigger.dev task); per-rep daily quota specific to this agent |
| Estimated Time | 0.75 engineer-week |
| Priority | P2 — valuable, not required for MVP acceptance criteria (PRD §6) |
| Risks | Overuse without a cap inflating AI cost (flagged in Doc 20 §15) — mitigated by the quota being built in from the start |
| Testing Strategy | Unit test for the stale-lead sweep query; cost-quota enforcement integration test |
| Definition of Done | A rep gets a lead summary grounded in real persisted data; the sweep correctly flags a fixture lead with 14+ days of no activity |

### M9 — Analytics & Cost

| Field | Detail |
|---|---|
| Objective | Give managers/admins visibility into whether the tool is working and what it costs |
| Dependencies | M1, M2, M4, M6 (needs real data flowing end-to-end) |
| Tasks | `/analytics/overview`, `/analytics/pipeline`, `/analytics/reps`, `/analytics/cost` endpoints; Analytics screen UI (Doc 17 §14); cost-ceiling alerting at 80% utilization |
| Estimated Time | 1 engineer-week |
| Priority | P1 |
| Risks | Metrics feel hollow without enough real usage volume yet — expected at MVP, not a defect; flag as an interpretation caveat at launch |
| Testing Strategy | Integration tests on rollup query correctness against seeded fixture data |
| Definition of Done | BRD §6 success criteria are all visibly measurable on this screen using real or realistic seeded data |

### M10 — Team & Settings

| Field | Detail |
|---|---|
| Objective | Let Admins manage the team without engineering involvement |
| Dependencies | M0 |
| Tasks | `/team` endpoints (invite, role change); `/settings/profile` endpoint (theme persistence, Doc 17 §16); Team & Settings UI |
| Estimated Time | 0.75 engineer-week |
| Priority | P1 |
| Risks | Low — smallest, most self-contained module |
| Testing Strategy | Role-authorization integration tests (only Admin changes roles, Doc 13 §4) |
| Definition of Done | An Admin invites a teammate and changes a role entirely through the UI; a rep's theme choice persists across devices |

### M11 — Observability & Hardening

| Field | Detail |
|---|---|
| Objective | Confirm the system is safe, monitored, and ready for real internal use |
| Dependencies | All prior modules |
| Tasks | Full role-authorization test pass (Doc 13 §4); cross-module cost-governance load test; Sentry/Trigger.dev/uptime alerting verified end-to-end (Doc 16 §13); security review against Doc 15's OWASP posture table; internal launch checklist sign-off |
| Estimated Time | 1.5 engineer-weeks |
| Priority | P0 — non-negotiable gate before rollout, even though it's scheduled last |
| Risks | Hardening is easy to under-scope under deadline pressure — its DoD is treated as fixed, not a buffer to cut |
| Testing Strategy | Full Doc 13 §4 critical-scenario list executed and passing, not sampled |
| Definition of Done | Every Doc 13 §4 critical scenario passes in staging; Admin/Manager/Sales Rep sign-off that the tool is ready for real leads |

**Total effort: ~16.5 engineer-weeks.**

## 2. GitHub Milestones

| # | Milestone | Maps to | Target |
|---|---|---|---|
| 1 | `M0 - Platform Foundation` | M0 | Sprint 1 |
| 2 | `M1 - Lead Discovery` | M1 | Sprint 2 |
| 3 | `M2 - Lead Pipeline / CRM` | M2 | Sprint 3 |
| 4 | `M3 - Business Intelligence` | M3 | Sprint 3 |
| 5 | `M4 - AI Generation Core` | M4 | Sprint 3–4 |
| 6 | `M5 - Website Preview & Generator UI` | M5 | Sprint 4 |
| 7 | `M6 - Deployment` | M6 | Sprint 5 |
| 8 | `M7 - Sales & Outreach` | M7 | Sprint 5 |
| 9 | `M8 - CRM Assistant` | M8 | Sprint 6 |
| 10 | `M9 - Analytics & Cost` | M9 | Sprint 6 |
| 11 | `M10 - Team & Settings` | M10 | Sprint 6 |
| 12 | `M11 - Observability & Hardening` | M11 | Sprint 7 |

## 3. GitHub Issues (representative, per module)

Labels use three axes: `type:*` (feature/infra/bug/test), `area:*` (backend/frontend/ai/infra), `priority:*` (P0/P1/P2). Every issue's detailed acceptance criteria trace back to the PRD FR-ID or Doc section cited in §1 — not re-stated per issue to avoid duplication.

**M0**
| Issue | Labels |
|---|---|
| Initialize Turborepo/pnpm monorepo skeleton | `type:infra` `area:infra` `priority:P0` |
| Provision Neon, Railway, Vercel, Upstash, R2, GitHub org, Trigger.dev | `type:infra` `area:infra` `priority:P0` |
| Implement Prisma schema + initial migration | `type:infra` `area:backend` `priority:P0` |
| Clerk integration + domain-restricted login | `type:feature` `area:backend` `priority:P0` |
| Global auth guard + role guard + RBAC decorators | `type:feature` `area:backend` `priority:P0` |
| CI pipeline: lint/typecheck/test/build gates | `type:infra` `area:infra` `priority:P0` |
| `packages/logger` + Sentry wiring | `type:infra` `area:infra` `priority:P1` |

**M1**
| Issue | Labels |
|---|---|
| Google Places API adapter | `type:feature` `area:backend` `priority:P0` |
| Lead Finder Agent (Trigger.dev task) | `type:feature` `area:backend` `priority:P0` |
| Website Checker Agent — heuristic tier | `type:feature` `area:backend` `priority:P0` |
| Website Checker Agent — AI-fallback tier | `type:feature` `area:ai` `priority:P1` |
| `discovery-jobs` + `leads` list endpoints | `type:feature` `area:backend` `priority:P0` |
| Discovery screen UI | `type:feature` `area:frontend` `priority:P0` |
| Redis discovery-result caching | `type:feature` `area:backend` `priority:P1` |

**M2**
| Issue | Labels |
|---|---|
| Lead CRUD + PATCH endpoints | `type:feature` `area:backend` `priority:P0` |
| Pipeline list/filter UI | `type:feature` `area:frontend` `priority:P0` |
| Kanban view | `type:feature` `area:frontend` `priority:P1` |
| Global search endpoint + UI | `type:feature` `area:backend` `priority:P1` |
| Audit-log hooks on stage change | `type:feature` `area:backend` `priority:P0` |

**M3**
| Issue | Labels |
|---|---|
| AiService gateway scaffolding (provider adapters, prompt registry, cost tracker) | `type:infra` `area:ai` `priority:P0` |
| Business Analyzer Agent | `type:feature` `area:ai` `priority:P0` |
| `/leads/{id}/business` endpoint | `type:feature` `area:backend` `priority:P0` |
| Business Details UI tab | `type:feature` `area:frontend` `priority:P0` |
| Output validation + guardrails | `type:feature` `area:ai` `priority:P0` |

**M4**
| Issue | Labels |
|---|---|
| Theme Selector Agent | `type:feature` `area:ai` `priority:P0` |
| Content Writer Agent (per-page) | `type:feature` `area:ai` `priority:P0` |
| SEO Agent | `type:feature` `area:ai` `priority:P0` |
| Image Optimizer Agent + alt-text | `type:feature` `area:ai` `priority:P0` |
| Website Generator Agent (deterministic assembly) | `type:feature` `area:backend` `priority:P0` |
| Category template: restaurant | `type:feature` `area:frontend` `priority:P0` |
| Category template: salon/clinic | `type:feature` `area:frontend` `priority:P1` |

**M5**
| Issue | Labels |
|---|---|
| Pipeline stepper component | `type:feature` `area:frontend` `priority:P0` |
| Live preview iframe pane | `type:feature` `area:frontend` `priority:P0` |
| Regenerate-by-instruction control | `type:feature` `area:frontend` `priority:P0` |
| Generation job status polling | `type:feature` `area:frontend` `priority:P0` |

**M6**
| Issue | Labels |
|---|---|
| GitHub adapter (repo create/update) | `type:feature` `area:backend` `priority:P0` |
| Vercel adapter (project create/update, deploy trigger) | `type:feature` `area:backend` `priority:P0` |
| Deployment Agent | `type:feature` `area:backend` `priority:P0` |
| `/websites/{id}/deployments` endpoints | `type:feature` `area:backend` `priority:P0` |
| Vercel webhook ingestion | `type:feature` `area:backend` `priority:P0` |
| Deployment status UI | `type:feature` `area:frontend` `priority:P0` |

**M7**
| Issue | Labels |
|---|---|
| Sales Agent | `type:feature` `area:ai` `priority:P1` |
| Proposal Generator | `type:feature` `area:ai` `priority:P1` |
| Proposals UI | `type:feature` `area:frontend` `priority:P1` |
| No-auto-send trust-boundary test | `type:test` `area:backend` `priority:P0` |

**M8**
| Issue | Labels |
|---|---|
| CRM Assistant agent | `type:feature` `area:ai` `priority:P2` |
| Summarize endpoint + UI trigger | `type:feature` `area:frontend` `priority:P2` |
| Daily stale-lead sweep task | `type:feature` `area:backend` `priority:P2` |
| Per-rep quota for CRM Assistant | `type:feature` `area:backend` `priority:P1` |

**M9**
| Issue | Labels |
|---|---|
| `/analytics/overview` endpoint | `type:feature` `area:backend` `priority:P1` |
| `/analytics/pipeline`, `/analytics/reps` endpoints | `type:feature` `area:backend` `priority:P1` |
| `/analytics/cost` endpoint | `type:feature` `area:backend` `priority:P1` |
| Analytics screen UI | `type:feature` `area:frontend` `priority:P1` |
| Cost-ceiling alerting (80% threshold) | `type:feature` `area:infra` `priority:P0` |

**M10**
| Issue | Labels |
|---|---|
| `/team` endpoints | `type:feature` `area:backend` `priority:P1` |
| `/settings/profile` endpoint | `type:feature` `area:backend` `priority:P1` |
| Team & Settings UI | `type:feature` `area:frontend` `priority:P1` |

**M11**
| Issue | Labels |
|---|---|
| Full role-authorization test pass | `type:test` `area:backend` `priority:P0` |
| Cross-module cost-governance load test | `type:test` `area:infra` `priority:P0` |
| Alerting end-to-end verification | `type:test` `area:infra` `priority:P0` |
| Security review vs. OWASP posture table | `type:test` `area:infra` `priority:P0` |
| Internal launch checklist sign-off | `type:infra` `area:infra` `priority:P0` |

## 4. Sprint Planning

> Assumes a **3-engineer team** (this roadmap's estimates scale down with 4–5, up with 2 — call this out if actual headcount differs) and **2-week sprints**, using the Track A (Backend/Platform) / Track B (AI) / Track C (Frontend) split from Doc 10. Illustrative start: the week of **August 3, 2026** — shift freely.

| Sprint | Weeks | Track A (Backend/Platform) | Track B (AI) | Track C (Frontend) |
|---|---|---|---|---|
| 1 | 1–2 | M0 (all hands) | M0 (all hands) | M0 (all hands) |
| 2 | 3–4 | M1 Lead Discovery | M4 AI Gateway groundwork (shared w/ M3) | M5 UI scaffolding (design system, Doc 17) |
| 3 | 5–6 | M2 Lead Pipeline/CRM | M3 Business Intelligence | M5 Generation Review screen |
| 4 | 7–8 | M6 Deployment (start) | M4 AI Generation Core (agents) | M5 completion + M1/M2 UI polish |
| 5 | 9–10 | M6 completion + M9 backend | M7 Sales & Outreach | M9 Analytics UI |
| 6 | 11–12 | M10 Team/Settings backend | M8 CRM Assistant | M10 UI + cross-module polish |
| 7 | 13–14 | M11 Observability & Hardening (all hands) | M11 (all hands) | M11 (all hands) |
| 8 | 15–16 | Buffer / bug-fix sprint | Buffer / bug-fix sprint | Internal rollout support |

**~16 weeks (4 months) to internal launch** at 3 engineers, per this plan. This is the single biggest lever the founder can pull: adding a 4th engineer to Track C from Sprint 2 (frontend has the most schedule slack in this plan) would compress the timeline by roughly 2–3 weeks without touching the AI/backend critical path (M0→M1/M3→M4→M5→M6, which is inherently sequential and doesn't parallelize further no matter how many people are added).

---
**Implementation roadmap complete. This is the last planning artifact before actual code — awaiting your go-ahead to begin Sprint 1.**
