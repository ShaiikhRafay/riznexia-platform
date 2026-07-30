# Development Roadmap — Riznexia AI Sales Platform

**Status:** Draft (revised — 8-phase master structure); superseded in practice by [21-implementation-roadmap.md](21-implementation-roadmap.md) — see doc-sync note
**Last updated:** 2026-07-29

> **Structure note:** Roadmap reorganized around the founder-approved 8-phase master sequence. Each phase's internal breakdown from the prior draft is nested below as sub-steps.
>
> **Doc-sync note (2026-07-29):** After Phase 2, the founder proceeded directly to module-based implementation via [21-implementation-roadmap.md](21-implementation-roadmap.md) (M1–M12) rather than working this document's Phase 3→4→...→8 gates one at a time — Phase 3 (UI/UX) was never formally closed as its own gate, and Phase 4 (Backend) is now well underway without a separate Phase 3 sign-off ever having happened. This document's phase framing is kept for historical record; **`docs/21-implementation-roadmap.md` and `TASKS.md` are the current, authoritative source of truth for implementation status.** See DECISIONS.md D-029.

## Master Phase Sequence

```
Phase 1 → Documentation
Phase 2 → System Design
Phase 3 → UI/UX
Phase 4 → Backend
Phase 5 → Frontend
Phase 6 → AI Agents
Phase 7 → Deployment
Phase 8 → Production
```

Each phase ends with an explicit stop for founder approval before the next begins (per project ground rules).

## Phase 1 — Documentation ✅ Complete

All 15 foundational documents (Product Vision through Security Strategy), revised for the internal-tool scope. No application code.

## Phase 2 — System Design ✅ Complete

Deep design delivered in [16-system-architecture.md](16-system-architecture.md) (Principal Architect pass: high/low-level architecture, service boundaries, all infra layers, design patterns, scalability, and a Post-MVP expansion plan) on top of Phase 1's Technical Architecture, Database Design, and API Specifications docs. Both prior open items resolved:

- Internal API cost ceiling set at $300/month starting policy (Technical Architecture §10).
- Lead visibility confirmed org-wide (Technical Architecture §5, §10).

Actual infra provisioning (Neon, Railway, Vercel, Clerk, Trigger.dev, GitHub org) happens at the start of Phase 4 (Backend), not as a standalone step — no value in provisioning empty infrastructure ahead of the code that uses it.

## Phase 3 — UI/UX

- Wireframes/mockups for the key screens defined in UI/UX Design System §5 (Dashboard Home, Discovery, Leads/Pipeline, Generation Review, Deployment Status, Proposals, Team, Cost).
- Design token finalization (final brand color, typography choice — currently placeholder).
- Component inventory for `packages/ui` before implementation begins.

## Phase 4 — Backend (substantially underway — see doc-sync note above)

- ✅ Monorepo scaffolding (Turborepo/pnpm), NestJS API skeleton.
- ✅ `packages/db` schema + migrations (hand-authored; no live Neon instance in the current dev environment, DECISIONS.md D-020).
- ✅ Clerk integration: employee login, `team_member` table, six-role RBAC (hierarchy + fine-grained permission middleware, Module M3, DECISIONS.md D-023–D-028) — a materially deeper role model than "role guard middleware" originally implied here.
- ✅ `discovery` and `leads` feature modules (Modules M1–M2); `business` module added (Module M2, not originally listed here — the discovery/pipeline data model split into `Business` + `Lead`, DECISIONS.md D-018).
- ⬜ `generation`, `deployment`, `pitch`, `team` feature modules — not started (Modules M6–M11, M4/Backlog).
- ⬜ `AiService` gateway (`packages/ai`) scaffolding — not started.
- ✅ Google Places integration, no-website/outdated detection heuristic (Module M1).

## Phase 5 — Frontend

- Next.js dashboard implementation consuming the Phase 4 API.
- All screens from Phase 3 UI/UX built out against real endpoints.
- Live status/progress UI for async discovery/generation/deployment jobs.

## Phase 6 — AI Agents

- Business Analysis, Brand Strategist, Content Generator, SEO Strategist, Pitch Drafting agents (AI Agent Architecture §2).
- Prompt template versioning (`packages/ai/prompts`), output validation/guardrails.
- Category site templates (`apps/site-template`), starting with 1–2 categories.
- Cost governance enforcement (per-rep/global spend ceilings).

## Phase 7 — Deployment

- GitHub + Vercel automation for demo site deployment (Technical Architecture §6).
- Platform CI/CD pipeline (Deployment Strategy) — preview/staging/production environments.
- Webhook ingestion (`/webhooks/vercel`, `/webhooks/clerk`).

## Phase 8 — Production

- Role-authorization and cost-governance test pass (Security Strategy, Testing Strategy).
- Load/cost testing at realistic internal sales-team volume.
- Internal rollout: enable the tool for the Riznexia sales team, monitoring in place.

## Suggested Staffing Split (2–5 engineers)

- **Track A (Platform/Backend):** Phases 2, 4, 7.
- **Track B (AI/Generation):** Phase 6 (can start once Phase 4's `AiService` scaffolding lands).
- **Track C (Frontend):** Phase 3, 5.

A team of 2 works these phases largely sequentially; a team of 4–5 can parallelize Backend/AI/Frontend from Phase 4 onward.

## Milestone Definition of Done

Each phase is done when its deliverables are complete **and** approved by the founder before the next phase begins — no phase starts on assumed approval.

---

**Phases 1–2 complete. Phase 4 (Backend) is substantially underway via the module roadmap (Doc 21) — Project Setup, M1 (Lead Discovery), M2 (Database & Core Domain Models), and M3 (Authentication & RBAC) are all complete; see TASKS.md for current status. Phase 3 (UI/UX implementation, as opposed to the Doc 17 wireframe design already delivered) and Phase 5 onward remain not started.**
