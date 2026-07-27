# Business Requirements Document (BRD) — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-27

> **Scope change note:** Internal tool for Riznexia employees only. No external customers, no billing, no client-facing surfaces. Supersedes the prior agency-SaaS-scoped version of this document.

## 1. Executive Summary

This platform is internal sales infrastructure: it finds businesses that need a website, generates a real demo site for each one automatically, deploys it live, and gives Riznexia's sales team a pipeline to manage the pitch. Its business case is sales efficiency and win-rate improvement for Riznexia itself — not third-party subscription revenue.

## 2. Business Objectives

- **BO-1:** Increase the number of qualified, demo-ready leads a Riznexia rep can work per week.
- **BO-2:** Increase pitch-to-close conversion rate by backing every pitch with a live, real demo site.
- **BO-3:** Reduce the cost/time to produce a first-draft demo site from days (manual) to minutes (automated).
- **BO-4:** Give sales leadership real pipeline visibility (stages, ownership, conversion) that doesn't exist today.
- **BO-5:** Keep the cost of running the tool itself (Google Places + AI + hosting) low and visible, since it is an internal cost center, not a revenue line.

## 3. Stakeholders

| Stakeholder | Interest |
|---|---|
| Founder/Leadership | Sales efficiency ROI, tool operating cost, pipeline visibility |
| Sales Reps | Fast, reliable path from lead to live demo to pitch |
| Sales/Ops Manager | Team pipeline oversight, lead assignment, conversion reporting |
| Engineering | Buildable, maintainable scope; no unnecessary customer-facing surface to secure/maintain |

## 4. Scope

### In Scope (MVP)
- Google Places–based business discovery and no-website/outdated-website detection
- Internal lead pipeline (CRM): stages, assignment, notes
- AI-driven business analysis (reviews, photos, category)
- AI-generated demo website: brand identity + multi-page content
- Demo deployment to a live URL (GitHub + Vercel, Riznexia-owned)
- AI-drafted outreach/pitch content per lead
- Internal team accounts with roles (Admin, Manager, Sales Rep)
- Internal cost tracking for Google Places/AI/hosting spend

### Explicitly Out of Scope
- **Client Portal** — no external login surface of any kind
- **Customer Login** — the businesses being pitched never authenticate into this system
- **Website Editing Interface** — no WYSIWYG/manual content editor; adjustments happen via AI regeneration with an instruction, not direct editing
- **Billing System** — no payment processing anywhere in this tool
- **Subscription Management** — no plans, no metered customer billing
- **Public Website Builder** — this is not a product offered to outside users

## 5. Business Requirements

| ID | Requirement | Priority |
|---|---|---|
| BR-1 | System must let a rep define a discovery search (city + category) and return qualified leads without a website or with an outdated one | Must |
| BR-2 | System must persist leads in an internal pipeline with stage tracking and rep assignment | Must |
| BR-3 | System must generate a complete demo website from a lead's data with no manual content writing required | Must |
| BR-4 | System must deploy the generated demo to a live, shareable URL | Must |
| BR-5 | System must draft outreach/pitch content for a lead via AI | Should |
| BR-6 | System must restrict access to Riznexia employees only, with role-appropriate permissions | Must |
| BR-7 | System must track cost of third-party API usage (Google Places, AI providers, hosting) to keep the tool's own operating cost visible and bounded | Must |
| BR-8 | System must give managers pipeline-level reporting (leads by stage, demos generated, conversion) | Should |

## 6. Success Criteria (Business-Level)

- Demo websites generated per week trending up as adoption grows.
- Measurable lift in pitch-to-close conversion for demo-backed pitches vs. non-demo pitches.
- Cost per generated demo stays within an acceptable internal budget ceiling.
- Time from lead discovery to live demo stays within the target production time (see PRD NFRs).

## 7. Assumptions

- Google Places API is a sufficiently accurate data source for "has no website / outdated website" detection in Riznexia's target markets.
- All users are trusted Riznexia employees — no adversarial-user threat model from within the user base itself (external threats still apply, see Security Strategy).
- English-language, category-templated demo content is acceptable quality for a first-pitch demo.

## 8. Constraints

- Small internal engineering team; architecture favors managed services.
- Latest stable technology choices, per project ground rules.
- Third-party API costs (Google Places, AI tokens, image generation, hosting) are a direct internal cost and must be governed by usage tracking/limits from day one.

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Google Places data quality/coverage varies by region | Poor lead quality | Start with well-covered markets; allow manual lead entry as fallback |
| AI-generated demo content is generic or inaccurate | Wastes rep time, damages pitch credibility | Ground generation in real business data; rep reviews the live demo before pitching (no auto-send to prospects) |
| Reps generate demos indiscriminately, driving up AI cost without a qualification filter | Cost overrun with no sales benefit | Require a lead to reach a "Qualified" pipeline stage before generation is allowed; per-rep/global cost ceilings |
| Google Places/AI API cost overrun | Erodes the tool's cost efficiency | Usage tracking (BR-7), rate limits, cost dashboards for managers |

## 10. Out-of-the-Box Decisions

None deferred to a pricing/billing exercise — this tool has no external pricing surface. The internal budget ceiling for API spend is set at **$300/month** as a starting policy (Technical Architecture §10), to be revisited once real per-demo cost data exists post-Phase 6.

---
**Proceeding to Document 3 (PRD).**
