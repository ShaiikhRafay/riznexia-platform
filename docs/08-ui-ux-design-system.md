# UI/UX Design System — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-29

> **Scope change note:** No "Billing/Settings" subscription screen, no content editor screen. Replaced with an internal "Team & Cost" admin screen and a "Generation Review" screen (preview + regenerate-by-instruction, no manual editing).
>
> **Doc-sync note (2026-07-29):** Role/permission gating on the Team and Cost screens updated to match Module M3's implemented RBAC. See DECISIONS.md D-029.

## 1. Scope: Two Distinct Design Surfaces

1. **The Riznexia Internal Dashboard** — used only by Riznexia employees (this document's primary focus).
2. **Generated Demo Websites** — the output shown to prospects, themed per industry. These use industry-specific theme tokens generated per lead, not the dashboard's design system, and are never edited through this dashboard's UI beyond triggering AI regeneration.

## 2. Dashboard Design Principles

- **Operator-density over marketing-polish.** Reps live in this tool daily running searches and scanning pipelines — optimize for information density and speed.
- **Status is always visible.** Discovery, generation, and deployment are async — status (queued/running/failed/done) must always be legible without a manual refresh.
- **No manual content editing surface, by design.** Any UI element that adjusts generated content must go through the AI regeneration endpoint (instruction-based), never a rich-text/WYSIWYG editor — this is a hard product boundary, not just a stylistic choice.

## 3. Tech Stack

- **Styling:** Tailwind CSS
- **Components:** shadcn/ui on Radix primitives
- **Icons:** Lucide
- **Charts (pipeline/cost metrics):** Recharts
- **State/data:** TanStack Query for server state

## 4. Design Tokens

### Color

- Neutral scale — Tailwind's `slate` as base.
- One accent color for Riznexia's internal product identity (placeholder: indigo `#4F46E5`, final hex TBD).
- Semantic colors: success, warning, danger, info — used consistently for job/deployment status.
- Light/dark theme support from the start (daily-use internal tool).

### Typography

- UI font: Inter (or system font stack fallback).
- Standard Tailwind type scale.

### Spacing & Layout

- Tailwind's default spacing scale.
- App shell: persistent left sidebar (Discovery, Leads/Pipeline, Websites, Proposals, Team, Cost, Settings) + top bar (user menu) + main content area.

## 5. Key Screens

1. **Dashboard Home** — pipeline overview: leads by stage, in-progress generations, recently deployed demos, recent activity.
2. **Discovery** — search form (city, category, radius) + job history + results table.
3. **Leads (Pipeline)** — filterable/sortable table + kanban view toggle; lead detail drawer showing Places data, AI analysis, and action buttons (analyze, generate demo, draft pitch).
4. **Generation Review** — pipeline progress view (stage-by-stage status matching `generation_job` rows), live preview pane (iframe of the draft site), section-level "regenerate with instruction" controls. **No text-editing fields on this screen — regeneration is the only content-adjustment mechanism.**
5. **Website/Deployment Status** — brand kit panel (palette/typography/logo, read-only display), deployment history, live demo URL, redeploy action.
6. **Proposals** — AI-drafted outreach editor (free-text edit before the rep copies/sends it manually), linked to the lead and live demo URL.
7. **Team** (`team:manage` permission — Super Admin/Admin/Sales Manager, Module M3) — invite/manage employee accounts and roles.
8. **Cost** (`cost:view` permission — Super Admin/Admin/Sales Manager, Module M3) — API spend dashboard (Google Places, AI text, AI image, hosting) by period.

## 6. Component Library Approach

`packages/ui` holds dashboard-only shared components (data table, status badge, pipeline stepper, kanban board, drawer/panel primitives) built on shadcn/ui.

## 7. Generated Demo Site Theme System (boundary reference)

Each generated demo site receives its own `brand_kit` (palette, typography, logo direction) applied to a fixed set of category-specific templates (`restaurant-default`, `clinic-default`, etc.). Templates define layout/structure; the brand kit supplies visual tokens. Content changes only via AI regeneration (§2) — there is no template/theme editor UI either.

## 8. Accessibility

- Target WCAG 2.1 AA for the dashboard.
- Generated demo sites also target AA (contrast validated against the generated palette programmatically before a demo is marked ready-for-review).

---

**Proceeding to Document 9 (AI Agent Architecture).**
