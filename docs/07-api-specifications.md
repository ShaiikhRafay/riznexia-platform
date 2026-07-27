# API Specifications — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-27

> **Scope change note:** No `/billing`, no Stripe webhook, no `/clients` resource (websites now nest under leads). Auth context is an employee + role, not a tenant.

## 1. Conventions

- **Style:** REST over JSON, versioned under `/api/v1`.
- **Auth:** Bearer JWT issued by Clerk, validated by a NestJS guard on every route except public webhooks. The authenticated `team_member` (id + role) is derived server-side from the validated token.
- **Errors:** Uniform envelope:
  ```json
  { "error": { "code": "LEAD_NOT_FOUND", "message": "Lead not found", "details": {} } }
  ```
- **Pagination:** Cursor-based (`?cursor=&limit=`) on all list endpoints.
- **Validation:** All request bodies validated against `packages/shared-types` zod schemas.
- **Idempotency:** Mutation endpoints that trigger billable-cost AI/external calls (generation, deployment, discovery) accept an `Idempotency-Key` header.

## 2. Resource Groups

| Group | Base path | Purpose |
|---|---|---|
| Auth/session | `/api/v1/me` | Current employee context (id, role) |
| Discovery | `/api/v1/discovery-jobs` | Trigger and monitor lead discovery |
| Leads | `/api/v1/leads` | Internal pipeline |
| Websites | `/api/v1/leads/:leadId/websites` | Generation, preview |
| Generation Jobs | `/api/v1/websites/:id/generation-jobs` | Pipeline stage status |
| Deployments | `/api/v1/websites/:id/deployments` | Deploy trigger/status/history |
| Sales Proposals | `/api/v1/leads/:id/proposals` | AI-drafted outreach |
| Team | `/api/v1/team` | Team member management (Admin/Manager only) |
| Cost | `/api/v1/cost` | Internal API cost dashboard data (Admin/Manager only) |
| Webhooks | `/api/v1/webhooks/*` | Clerk, Vercel inbound events |

## 3. Key Endpoints

### Discovery

```
POST /api/v1/discovery-jobs
Body: { "city": "Karachi", "categories": ["restaurant", "cafe"], "radiusKm": 15 }
201 -> { "id": "...", "status": "queued" }

GET /api/v1/discovery-jobs/:id
200 -> { "id": "...", "status": "running|completed|failed", "resultsCount": 42 }

GET /api/v1/leads?stage=qualified&city=Karachi&cursor=&limit=25
200 -> { "items": [Lead...], "nextCursor": "..." }
```

### Leads

```
GET /api/v1/leads/:id
PATCH /api/v1/leads/:id
Body: { "pipelineStage": "contacted", "assignedTo": "teamMemberId", "notes": "..." }
```

### Websites (Generation)

```
POST /api/v1/leads/:leadId/websites
Body: { "templateKey": "restaurant-default" }
201 -> { "id": "...", "status": "draft" }
// Guarded: leadId's pipelineStage must be "qualified" or later (PRD FR-4.1)

POST /api/v1/websites/:id/generate
Header: Idempotency-Key: <uuid>
202 -> { "generationJobId": "...", "status": "queued" }

GET /api/v1/websites/:id/generation-jobs
200 -> [ { "stage": "analysis", "status": "completed" }, { "stage": "brand", "status": "running" }, ... ]

GET /api/v1/websites/:id
200 -> { "id": "...", "status": "ready_for_review", "brandKit": {...}, "pages": [...] }

POST /api/v1/websites/:id/pages/:pageId/regenerate
Body: { "instruction": "Make the tone more formal" }
202 -> { "generationJobId": "..." }
// This is the ONLY content-adjustment endpoint — there is no PATCH-content-directly editing endpoint (explicit non-goal).
```

### Deployments

```
POST /api/v1/websites/:id/deployments
Header: Idempotency-Key: <uuid>
202 -> { "deploymentId": "...", "status": "queued" }

GET /api/v1/websites/:id/deployments
200 -> [ { "id": "...", "status": "live", "liveUrl": "https://...", "deployedAt": "..." } ]
```

### Sales Proposals

```
POST /api/v1/leads/:id/proposals
201 -> { "id": "...", "draftContent": "...", "status": "draft" }

PATCH /api/v1/leads/:id/proposals/:proposalId
Body: { "draftContent": "...", "status": "edited" }
// status can also be set to "sent_manually" as a log entry — the system never sends itself
```

### Team (Admin/Manager only)

```
GET /api/v1/team
POST /api/v1/team/invite
Body: { "email": "...", "role": "sales_rep" }
PATCH /api/v1/team/:id
Body: { "role": "manager" }
```

### Cost (Admin/Manager only)

```
GET /api/v1/cost/summary?period=last30days
200 -> { "totalCostUsd": 182.40, "byType": { "google_places": 22.10, "ai_text": 140.30, "ai_image": 20.00 } }
```

### Webhooks (inbound, signature-verified, no user auth)

```
POST /api/v1/webhooks/clerk
POST /api/v1/webhooks/vercel   // deployment status callbacks
```

## 4. Rate Limiting & Quotas

- Per-rep and global rate limits on `discovery-jobs` and `websites/:id/generate` (BRD BR-7, cost-governance) — returns `429` with `code: QUOTA_EXCEEDED`.
- Baseline IP-based rate limiting as an abuse guard, though relevant surface area is small given internal-only access.

## 5. Async Job Pattern

Endpoints that enqueue Trigger.dev work (`discover`, `generate`, `deploy`) always return `202 Accepted` with a job/resource ID immediately; clients poll the corresponding `GET` status endpoint. No endpoint blocks on AI or external API latency.

---
**Proceeding to Document 8 (UI/UX Design System).**
