# Product Requirements Document (PRD) — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-27

> **Scope change note:** Internal tool. All personas below are Riznexia employees. No external/customer persona exists — the businesses being pitched are data subjects (leads), never users of this system.

## 1. Personas

**P1 — Sales Rep ("Imran")**
Runs discovery searches, works leads through the pipeline, triggers demo generation, reviews the live demo, and sends the AI-drafted pitch manually. Primary daily user.

**P2 — Sales/Ops Manager ("Sana")**
Oversees the team's pipeline: assigns leads, monitors demo output and conversion, manages team accounts.

**P3 — Admin/Engineer**
Manages system configuration, team member accounts/roles, and monitors API cost.

## 2. Core User Journey

1. Rep runs a discovery search: city + business category.
2. System queries Google Places, filters for no-website/outdated-website businesses, stores them as leads.
3. Rep reviews leads, moves promising ones to "Qualified."
4. Rep triggers AI generation for a qualified lead: business analysis → brand identity → website content → full site build.
5. Rep reviews the generated preview.
6. Rep triggers deployment: a live demo URL is created.
7. Rep requests an AI-drafted pitch/outreach message referencing the live demo, edits it if needed, and sends it manually (outside the system — email/call/WhatsApp).
8. Lead status is updated through the pipeline (Contacted → In Discussion → Won/Lost) as the deal progresses.

## 3. Functional Requirements by Module

### 3.1 Lead Discovery
- FR-1.1: Rep can start a discovery search by city (or geo radius) + one or more business categories.
- FR-1.2: System queries Google Places and retrieves business name, address, category, rating, review count, photos, website field (if any).
- FR-1.3: System classifies each result as "no website," "has website" (excluded by default), or "outdated" (heuristic: no HTTPS, no mobile viewport meta, stale copyright year, etc.).
- FR-1.4: Qualifying businesses are stored as Leads.
- FR-1.5: Duplicate leads (same Google Place ID) are not re-created on repeat searches; the existing lead is refreshed instead.
- FR-1.6: Rep can see discovery job status/result count while a search runs (async job).

### 3.2 Lead Pipeline (Internal CRM)
- FR-2.1: Leads have a pipeline status (New → Qualified → Contacted → In Discussion → Won → Lost).
- FR-2.2: Rep can add notes and be assigned a lead (self-assign or manager-assigned).
- FR-2.3: Pipeline view supports filtering/sorting by status, category, city, date discovered, assigned rep.
- FR-2.4: A lead reaching "Won" is simply a terminal pipeline status — no separate client-portal handoff exists in this system.

### 3.3 AI Business Analysis
- FR-3.1: On a Qualified lead, AI analyzes reviews, photos, and category to produce a structured brand brief (tone, audience signals, standout qualities).
- FR-3.2: Analysis output is stored and visible to the rep before generation proceeds.

### 3.4 Demo Website Generation
- FR-4.1: Generation is only available once a lead is "Qualified" or later (BRD risk mitigation — prevents indiscriminate generation).
- FR-4.2: System generates a brand kit (logo direction, palette, typography).
- FR-4.3: System generates a full multi-page demo website (Home, About, Services/Menu, Gallery, Contact at minimum, category-dependent).
- FR-4.4: Content is specific to the business (real name, address, category norms, analysis output) — not generic placeholder copy.
- FR-4.5: Generated site includes a working contact form, embedded Google Map, and optional WhatsApp click-to-chat.
- FR-4.6: SEO basics are generated automatically (meta titles/descriptions, semantic headings, sitemap) — since a won deal's demo may become the business's real site.
- FR-4.7: Generation runs as a trackable async pipeline with visible per-stage progress.
- FR-4.8: Rep can regenerate a specific section (e.g., About copy, palette) by giving the AI a short instruction — **this is the only content-adjustment mechanism; there is no manual editing UI (explicit non-goal).**

### 3.5 Preview
- FR-5.1: Rep can preview the generated site before deployment.
- FR-5.2: Preview updates automatically as sections are regenerated (FR-4.8) — no separate "publish preview" step needed.

### 3.6 Demo Deployment
- FR-6.1: Rep can trigger deployment of a reviewed demo.
- FR-6.2: System creates/updates a GitHub repository (Riznexia-owned) containing the generated site code.
- FR-6.3: System deploys the repository to Vercel (Riznexia-owned) and returns a live demo URL.
- FR-6.4: Deployment status (building, live, failed) is visible to the rep.
- FR-6.5: Regenerating and redeploying is supported, with deployment history retained.

### 3.7 Internal Dashboard
- FR-7.1: Dashboard shows an overview: active leads by stage, in-progress generations, recently deployed demos, recent activity.
- FR-7.2: Lead detail view shows Places data, AI analysis, generated demo status/link, and pitch history.
- FR-7.3: Manager view: team pipeline rollup, per-rep lead counts, demo/conversion metrics.
- FR-7.4: Admin: team member management (invite, role assignment), API cost monitoring dashboard.

### 3.8 AI Pitch Drafting
- FR-8.1: Rep can request a drafted outreach/pitch message for a lead, referencing the live demo URL where available.
- FR-8.2: Draft is editable; the system never sends anything automatically — sending is always a manual action taken by the rep outside the system.

## 4. MVP Scope Table

| Capability | MVP | Explicitly Excluded |
|---|---|---|
| Discovery by city + category | Yes | — |
| No-website / outdated detection | Heuristic-based | ML confidence scoring (future) |
| AI business analysis | Yes | — |
| Brand kit + website generation | Yes, category-templated | Fully freeform custom layouts (future) |
| Content adjustment | AI regeneration by instruction | **Manual/WYSIWYG editing — excluded permanently** |
| Demo deployment | GitHub + Vercel, Riznexia-owned | Custom domains, multi-host (future) |
| Internal pipeline/CRM | Yes | — |
| AI pitch drafting | Draft only, manual send | Autonomous send/follow-up sequencing (future) |
| Team accounts/roles | Yes (internal only) | **Client login/portal — excluded permanently** |
| Billing | **Excluded permanently** | — |
| Public website builder | **Excluded permanently** | — |

## 5. Non-Functional Requirements (summary)

- **Performance:** End-to-end generation pipeline (analysis → brand → content → build) target under 5 minutes, with visible progress.
- **Access control:** Riznexia-employee-only access, enforced at auth (Security Strategy).
- **Cost governance:** Per-rep/global usage limits on discovery and generation to bound AI/Places spend (BRD BR-7).
- **Availability:** Managed-service-backed infra target 99.5% for MVP.

## 6. Acceptance Criteria (MVP Definition of Done)

The MVP is complete when a Riznexia sales rep can, without engineering help:
1. Run a discovery search and get back real, no-website leads for a chosen city/category.
2. Move a lead through the pipeline and have it assigned/tracked.
3. Trigger AI generation and get a previewable, business-specific multi-page demo site.
4. Deploy that demo to a live public URL.
5. Get an AI-drafted pitch message referencing the live demo.
6. See team pipeline and demo-output metrics on the dashboard (manager view).

---
**Proceeding to Document 4 (Technical Architecture).**
