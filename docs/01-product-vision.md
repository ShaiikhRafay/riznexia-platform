# Product Vision — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Owner:** Product/Architecture
**Last updated:** 2026-07-27

> **Scope change note:** This platform is an **internal tool for Riznexia employees only**. It is not a customer-facing SaaS product, not a website builder for external users, and has no client-facing login, billing, or editing surface. Any prior version of this document describing an external multi-tenant agency SaaS product is superseded.

## 1. Vision Statement

Riznexia's own sales team wins more deals, faster, by walking into every pitch with a live, working demo website already built for the prospect — generated automatically from real data about that business, not a mockup or a generic template.

## 2. The Problem

- Riznexia's sales reps spend a large share of their time on two low-leverage activities: manually searching for businesses that need a website, and manually researching each one before a pitch.
- A cold pitch ("we could build you a website") converts worse than a warm pitch backed by a live demo ("here's a website we already built for you — see it live"). Building that demo by hand per prospect doesn't scale across a sales team's full pipeline.
- Without a system, lead tracking lives in spreadsheets or memory — no consistent pipeline visibility for sales management.

## 3. The Solution

An internal tool that gives every Riznexia rep a repeatable pipeline:

1. **Discover** — pull local businesses from Google Places by city/category, detect which ones have no website or a stale one.
2. **Qualify** — store them as leads in an internal CRM/pipeline, assignable to reps.
3. **Understand** — AI analyzes the business's public footprint (reviews, photos, category) to infer positioning and tone.
4. **Generate** — AI produces a full, production-quality multi-page demo website for that specific business.
5. **Deploy** — the demo goes live at a real URL Riznexia can show or send.
6. **Pitch** — an AI-drafted outreach/proposal message helps the rep open the conversation, referencing the live demo.
7. **Track** — the deal moves through a pipeline visible to the whole sales team.

## 4. Users

**All users are Riznexia employees.** There is no external user of this system.

| Role | Need |
|---|---|
| Sales Rep | Find leads, generate demos fast, pitch, track their own pipeline |
| Sales/Ops Manager | Oversee team pipeline, assign leads, monitor conversion and demo output |
| Admin/Engineering | Maintain the system, manage team accounts, monitor AI/API cost |

## 5. Value Proposition

Every rep operates like they have a design/dev team behind them: a real, business-specific demo site ready in minutes, not days — turning "we could build you a website" into "here it is, live."

## 6. Why This Matters to Riznexia

- Increases pitch quality and conversion without increasing headcount.
- Increases the number of qualified, demo-ready prospects a single rep can carry.
- Creates a consistent, trackable sales pipeline instead of ad hoc lead management.

## 7. North Star Metric

**Demo websites generated and deployed per week**, weighted by **pitch-to-close conversion rate** for leads pitched with a generated demo versus without. Raw generation volume alone is not the goal — conversion lift is the real signal this tool is working.

Supporting metrics:
- Time from lead discovered → demo live
- Leads discovered → demo generated conversion rate
- Cost per generated demo (Google Places + AI + hosting)
- Rep pipeline throughput (leads actively worked per rep)

## 8. Explicit Non-Goals

This system is **not**:
- A customer-facing product. There is no client login, client portal, or self-serve access for the businesses being pitched.
- A general-purpose website builder or editor. Reps do not hand-edit generated sites in a WYSIWYG interface — content is regenerated via AI instruction, not manually edited.
- A billing or subscription platform. There is no monetization surface inside this tool; it exists purely to make Riznexia's own sales process faster and more effective.
- Public-facing in any capacity beyond the deployed demo URLs themselves, which exist only to be shown/sent to a specific prospect during a pitch.

---
**Proceeding to Document 2 (BRD).**
