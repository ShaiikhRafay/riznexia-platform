# API Architecture — Riznexia AI Sales Platform

**Status:** Draft — deep API design deliverable
**Role:** Backend Architect pass
**Last updated:** 2026-07-29

> **Scope note:** Deepens Doc 07 (API Specifications) into a complete, implementation-ready contract: every resource group requested, pagination/filtering/sorting conventions, a full error code catalog, and an OpenAPI 3.0 specification. No implementation code — this is the contract, not the handlers.
>
> **Naming note:** "Projects" (requested) and "Website Generator" (requested) both map to the single `website` resource defined in Doc 18 — a Project _is_ a website-generation effort tied to a lead. No separate `Project` entity exists; this avoids two names for one thing across the doc set.
>
> **Doc-sync note (2026-07-29):** `TeamMember.role` enum and every `role`-valued example updated to the six roles implemented in Module M3. `GET /leads`/`GET /leads/:id` (the only resources in this spec actually built so far, Modules M1–M2) are unchanged at the contract level despite the `Business`/`Lead` schema split behind them (DECISIONS.md D-018) — that split is an internal composition detail, not an API change. "Admin/Manager only" annotations updated to name the actual permission each gates (Module M3). See DECISIONS.md D-029.

---

## 1. API Design Conventions

| Concern          | Convention                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base path        | `/api/v1`                                                                                                                                                                               |
| Auth             | `Authorization: Bearer <Clerk JWT>` on every route except signed webhooks                                                                                                               |
| Content type     | `application/json` throughout                                                                                                                                                           |
| Pagination       | Cursor-based: `?cursor=<opaque>&limit=<1-100, default 25>`; response includes `nextCursor` (null when exhausted)                                                                        |
| Filtering        | Flat query params per resource (e.g. `?stage=qualified&city=Karachi`) — no generic `filter[]` syntax, kept simple since filter sets are small and resource-specific                     |
| Sorting          | `?sort=field` (ascending) or `?sort=-field` (descending); each endpoint whitelists sortable fields, unlisted fields return `400 INVALID_SORT_FIELD`                                     |
| Full-text search | `?q=<term>` where noted (Leads, global Search)                                                                                                                                          |
| Validation       | Every request body validated against a zod schema (`packages/shared-types`) before reaching business logic; violations return `400 VALIDATION_ERROR` with per-field detail              |
| Idempotency      | `Idempotency-Key` header (client-generated UUID) required on cost-incurring mutations (`generate`, `deploy`, `discover`); replayed key returns the original result, not a duplicate job |
| Errors           | Uniform envelope (§4)                                                                                                                                                                   |
| Versioning       | Path-based (`/v1`); breaking changes ship as `/v2`, old version deprecated with notice, never mutated in place                                                                          |

## 2. Resource Groups

| Requested item    | API surface                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Authentication    | `/me`, Clerk-issued JWT validated on every request (§3)                                       |
| Businesses        | `/leads/{id}/business` (Places data + AI analysis view over a Lead)                           |
| Leads             | `/leads`, `/discovery-jobs`                                                                   |
| Website Generator | `/leads/{id}/websites`, `/websites/{id}/generate`, `/websites/{id}/pages/{pageId}/regenerate` |
| Projects          | Same as Website Generator — see naming note above                                             |
| Deployments       | `/websites/{id}/deployments`                                                                  |
| AI Agents         | `/websites/{id}/generation-jobs`, `/leads/{id}/proposals`                                     |
| Analytics         | `/analytics/*`                                                                                |
| Settings          | `/settings/profile`, `/team`                                                                  |
| Search            | `/search`                                                                                     |

## 3. Authentication

- Clerk issues the JWT on employee sign-in (domain-restricted, invite-only — Security Strategy §1). Clerk remains the sole authentication provider — Module M3 built authorization (RBAC) on top of it, not a replacement (DECISIONS.md D-023).
- Every request carries `Authorization: Bearer <token>`; a global NestJS guard chain validates the token against Clerk, resolves `{ teamMemberId, role }`, and attaches it to the request context — then applies an exact-role-list check, a role-hierarchy check, and a fine-grained permission check in sequence (Module M3, System Architecture §15).
- `GET /me` returns the resolved identity — the frontend's source of truth for "who am I / what can I see" (role-gated nav items, Doc 17 §7).
- No endpoint accepts a client-supplied tenant/role/permission claim — role is always server-resolved from the validated token, never trusted from the request body.

```
GET /me
200 -> { "id": "...", "name": "...", "email": "...", "role": "sales_executive" }
```

## 4. Error Code Catalog

Uniform envelope:

```json
{ "error": { "code": "LEAD_NOT_FOUND", "message": "Lead not found", "details": {} } }
```

| HTTP Status | Code                           | Meaning                                                                                                                              |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 400         | `VALIDATION_ERROR`             | Request body/query failed schema validation; `details` lists per-field errors                                                        |
| 400         | `INVALID_SORT_FIELD`           | `sort` param references a non-whitelisted field                                                                                      |
| 401         | `UNAUTHENTICATED`              | Missing/invalid/expired JWT                                                                                                          |
| 403         | `FORBIDDEN`                    | Authenticated but role lacks permission for this action                                                                              |
| 404         | `RESOURCE_NOT_FOUND`           | Generic fallback; specific resources use e.g. `LEAD_NOT_FOUND`, `WEBSITE_NOT_FOUND`, `DEPLOYMENT_NOT_FOUND`, `TEAM_MEMBER_NOT_FOUND` |
| 409         | `DUPLICATE_LEAD`               | `google_place_id` already exists (discovery dedupe, Doc 18 §5)                                                                       |
| 409         | `IDEMPOTENCY_KEY_CONFLICT`     | Same key reused with a different request body                                                                                        |
| 422         | `GENERATION_NOT_ALLOWED_STAGE` | Generation attempted on a lead below `qualified` (PRD FR-4.1)                                                                        |
| 422         | `WEBSITE_NOT_READY`            | Deployment attempted before generation reaches `ready_for_review`                                                                    |
| 429         | `RATE_LIMITED`                 | Baseline per-IP/per-user rate limit exceeded                                                                                         |
| 429         | `QUOTA_EXCEEDED`               | Per-rep or org-wide cost/usage ceiling reached (BRD BR-7, $300/month default)                                                        |
| 500         | `INTERNAL_ERROR`               | Unhandled server fault                                                                                                               |
| 502         | `UPSTREAM_PROVIDER_ERROR`      | Google Places / Claude / image-gen / GitHub / Vercel call failed after retries                                                       |
| 503         | `SERVICE_UNAVAILABLE`          | Planned maintenance or dependency outage                                                                                             |

## 5. OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: Riznexia AI Sales Platform API
  version: '1.0'
  description: >
    Internal API for Riznexia employees. Discovers businesses, manages the
    sales pipeline, generates AI-driven demo websites, deploys them, and
    tracks pitch/proposal activity. No external/customer access exists.
servers:
  - url: https://api.riznexia.internal/api/v1
    description: Production
  - url: https://staging-api.riznexia.internal/api/v1
    description: Staging

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    CursorParam:
      name: cursor
      in: query
      schema: { type: string }
    LimitParam:
      name: limit
      in: query
      schema: { type: integer, minimum: 1, maximum: 100, default: 25 }
    SortParam:
      name: sort
      in: query
      schema: { type: string }
      description: "Field name, optionally prefixed with '-' for descending"
    IdempotencyKeyHeader:
      name: Idempotency-Key
      in: header
      required: true
      schema: { type: string, format: uuid }

  responses:
    BadRequest:
      description: Validation error
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    Unauthorized:
      description: Missing/invalid token
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    Forbidden:
      description: Role does not permit this action
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    Conflict:
      description: Duplicate or idempotency conflict
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    UnprocessableEntity:
      description: Business rule violation
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }
    TooManyRequests:
      description: Rate or quota limit exceeded
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorEnvelope' }

  schemas:
    ErrorEnvelope:
      type: object
      properties:
        error:
          type: object
          properties:
            code: { type: string, example: LEAD_NOT_FOUND }
            message: { type: string }
            details: { type: object }

    TeamMember:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        email: { type: string, format: email }
        role:
          {
            type: string,
            enum: [super_admin, admin, sales_manager, developer, sales_executive, viewer],
          }

    Lead:
      type: object
      properties:
        id: { type: string, format: uuid }
        businessName: { type: string }
        category: { type: string }
        city: { type: string }
        address: { type: string }
        websiteStatus: { type: string, enum: [none, outdated, present] }
        pipelineStage: { type: string, enum: [new, qualified, contacted, in_discussion, won, lost] }
        assignedTo: { type: string, format: uuid, nullable: true }
        notes: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }

    BusinessDetail:
      type: object
      description: Read-only view combining Places data and latest AI analysis for a lead
      properties:
        leadId: { type: string, format: uuid }
        placesData:
          type: object
          properties:
            rating: { type: number }
            reviewCount: { type: integer }
            photos: { type: array, items: { type: string, format: uri } }
        analysis:
          type: object
          nullable: true
          properties:
            brandBrief: { type: object }
            sentimentSummary: { type: object }
            aiModelUsed: { type: string }
            createdAt: { type: string, format: date-time }

    DiscoveryJob:
      type: object
      properties:
        id: { type: string, format: uuid }
        city: { type: string }
        category: { type: string }
        status: { type: string, enum: [queued, running, completed, failed] }
        resultsCount: { type: integer }

    Website:
      type: object
      description: "A 'Project' — one demo website generation effort for a lead"
      properties:
        id: { type: string, format: uuid }
        leadId: { type: string, format: uuid }
        status: { type: string, enum: [draft, generating, ready_for_review, deployed, failed] }
        templateKey: { type: string }
        brandKit:
          type: object
          nullable: true
          properties:
            palette: { type: object }
            typography: { type: object }
            logoAssetUrl: { type: string, format: uri, nullable: true }
        pages:
          type: array
          items: { $ref: '#/components/schemas/WebsitePage' }

    WebsitePage:
      type: object
      properties:
        id: { type: string, format: uuid }
        slug: { type: string }
        title: { type: string }
        contentBlocks: { type: array, items: { type: object } }
        seoMetaTitle: { type: string, nullable: true }

    GenerationJob:
      type: object
      properties:
        id: { type: string, format: uuid }
        stage: { type: string, enum: [analysis, brand, content, image, seo, build] }
        status: { type: string, enum: [queued, running, completed, failed] }
        errorMessage: { type: string, nullable: true }

    Deployment:
      type: object
      properties:
        id: { type: string, format: uuid }
        githubRepoUrl: { type: string, format: uri, nullable: true }
        liveUrl: { type: string, format: uri, nullable: true }
        status: { type: string, enum: [queued, running, completed, failed] }
        deployedAt: { type: string, format: date-time, nullable: true }

    SalesProposal:
      type: object
      properties:
        id: { type: string, format: uuid }
        draftContent: { type: string }
        status: { type: string, enum: [draft, edited, sent_manually] }

    AnalyticsOverview:
      type: object
      properties:
        leadsThisWeek: { type: integer }
        demosGenerated: { type: integer }
        conversionRate: { type: number }
        costThisMonthUsd: { type: number }
        costCeilingUsd: { type: number, example: 300 }

paths:
  /me:
    get:
      summary: Current authenticated employee
      tags: [Authentication]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TeamMember' }
        '401': { $ref: '#/components/responses/Unauthorized' }

  /discovery-jobs:
    post:
      summary: Start a discovery search
      tags: [Leads]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [city, categories]
              properties:
                city: { type: string }
                categories: { type: array, items: { type: string } }
                radiusKm: { type: number, default: 15 }
      responses:
        '201':
          description: Job queued
          content:
            application/json:
              schema: { $ref: '#/components/schemas/DiscoveryJob' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '429': { $ref: '#/components/responses/TooManyRequests' }
    get:
      summary: List discovery jobs
      tags: [Leads]
      parameters:
        - $ref: '#/components/parameters/CursorParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  items: { type: array, items: { $ref: '#/components/schemas/DiscoveryJob' } }
                  nextCursor: { type: string, nullable: true }

  /discovery-jobs/{id}:
    get:
      summary: Discovery job status
      tags: [Leads]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/DiscoveryJob' }
        '404': { $ref: '#/components/responses/NotFound' }

  /leads:
    get:
      summary: List leads (pipeline)
      tags: [Leads]
      parameters:
        - $ref: '#/components/parameters/CursorParam'
        - $ref: '#/components/parameters/LimitParam'
        - $ref: '#/components/parameters/SortParam'
        - { name: stage, in: query, schema: { type: string } }
        - { name: city, in: query, schema: { type: string } }
        - { name: category, in: query, schema: { type: string } }
        - { name: assignedTo, in: query, schema: { type: string, format: uuid } }
        - {
            name: q,
            in: query,
            schema: { type: string },
            description: 'Free-text search over business name',
          }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  items: { type: array, items: { $ref: '#/components/schemas/Lead' } }
                  nextCursor: { type: string, nullable: true }

  /leads/{id}:
    get:
      summary: Get lead
      tags: [Leads]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '200':
          {
            description: OK,
            content: { application/json: { schema: { $ref: '#/components/schemas/Lead' } } },
          }
        '404': { $ref: '#/components/responses/NotFound' }
    patch:
      summary: Update lead (stage, assignment, notes)
      tags: [Leads]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                pipelineStage: { type: string }
                assignedTo: { type: string, format: uuid, nullable: true }
                notes: { type: string }
      responses:
        '200':
          {
            description: OK,
            content: { application/json: { schema: { $ref: '#/components/schemas/Lead' } } },
          }
        '400': { $ref: '#/components/responses/BadRequest' }
        '404': { $ref: '#/components/responses/NotFound' }
    delete:
      summary: Soft-delete lead
      tags: [Leads]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '204': { description: Deleted }
        '404': { $ref: '#/components/responses/NotFound' }

  /leads/{id}/business:
    get:
      summary: Business detail (Places data + latest AI analysis)
      tags: [Businesses]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '200':
          {
            description: OK,
            content:
              { application/json: { schema: { $ref: '#/components/schemas/BusinessDetail' } } },
          }
        '404': { $ref: '#/components/responses/NotFound' }
    post:
      summary: Trigger (re)analysis
      tags: [Businesses, AI Agents]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '202': { description: Analysis queued }
        '404': { $ref: '#/components/responses/NotFound' }
        '429': { $ref: '#/components/responses/TooManyRequests' }

  /leads/{leadId}/websites:
    post:
      summary: Create a website generation project
      tags: [Website Generator, Projects]
      parameters:
        [{ name: leadId, in: path, required: true, schema: { type: string, format: uuid } }]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [templateKey]
              properties: { templateKey: { type: string } }
      responses:
        '201':
          {
            description: Created,
            content: { application/json: { schema: { $ref: '#/components/schemas/Website' } } },
          }
        '422': { $ref: '#/components/responses/UnprocessableEntity' }
    get:
      summary: List websites for a lead
      tags: [Website Generator, Projects]
      parameters:
        [{ name: leadId, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '200':
          {
            description: OK,
            content:
              {
                application/json:
                  { schema: { type: array, items: { $ref: '#/components/schemas/Website' } } },
              },
          }

  /websites/{id}:
    get:
      summary: Get website/project
      tags: [Website Generator, Projects]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '200':
          {
            description: OK,
            content: { application/json: { schema: { $ref: '#/components/schemas/Website' } } },
          }
        '404': { $ref: '#/components/responses/NotFound' }

  /websites/{id}/generate:
    post:
      summary: Run the generation pipeline
      tags: [Website Generator, AI Agents]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
        - $ref: '#/components/parameters/IdempotencyKeyHeader'
      responses:
        '202': { description: Pipeline queued }
        '409': { $ref: '#/components/responses/Conflict' }
        '429': { $ref: '#/components/responses/TooManyRequests' }

  /websites/{id}/generation-jobs:
    get:
      summary: Per-stage pipeline status
      tags: [AI Agents]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '200':
          {
            description: OK,
            content:
              {
                application/json:
                  {
                    schema: { type: array, items: { $ref: '#/components/schemas/GenerationJob' } },
                  },
              },
          }

  /websites/{id}/pages/{pageId}/regenerate:
    post:
      summary: Regenerate one section by instruction (only content-adjustment mechanism — no manual edit endpoint exists)
      tags: [Website Generator, AI Agents]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
        - { name: pageId, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [instruction]
              properties: { instruction: { type: string } }
      responses:
        '202': { description: Regeneration queued }

  /websites/{id}/deployments:
    post:
      summary: Deploy the reviewed website
      tags: [Deployments]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
        - $ref: '#/components/parameters/IdempotencyKeyHeader'
      responses:
        '202': { description: Deployment queued }
        '422': { $ref: '#/components/responses/UnprocessableEntity' }
    get:
      summary: Deployment history
      tags: [Deployments]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '200':
          {
            description: OK,
            content:
              {
                application/json:
                  { schema: { type: array, items: { $ref: '#/components/schemas/Deployment' } } },
              },
          }

  /leads/{id}/proposals:
    post:
      summary: Draft an AI pitch/proposal
      tags: [AI Agents]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '201':
          {
            description: Created,
            content:
              { application/json: { schema: { $ref: '#/components/schemas/SalesProposal' } } },
          }
    get:
      summary: List proposals for a lead
      tags: [AI Agents]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses:
        '200':
          {
            description: OK,
            content:
              {
                application/json:
                  {
                    schema: { type: array, items: { $ref: '#/components/schemas/SalesProposal' } },
                  },
              },
          }

  /leads/{id}/proposals/{proposalId}:
    patch:
      summary: Edit a proposal draft or mark sent (system never sends itself)
      tags: [AI Agents]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
        - { name: proposalId, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                draftContent: { type: string }
                status: { type: string, enum: [draft, edited, sent_manually] }
      responses:
        '200':
          {
            description: OK,
            content:
              { application/json: { schema: { $ref: '#/components/schemas/SalesProposal' } } },
          }

  /analytics/overview:
    get:
      summary: North-star and BRD success-criteria metrics
      tags: [Analytics]
      responses:
        '200':
          {
            description: OK,
            content:
              { application/json: { schema: { $ref: '#/components/schemas/AnalyticsOverview' } } },
          }

  /analytics/pipeline:
    get:
      summary: Leads grouped by pipeline stage
      tags: [Analytics]
      responses:
        '200': { description: OK }

  /analytics/reps:
    get:
      summary: Per-rep leaderboard (`cost:view` permission — Super Admin/Admin/Sales Manager)
      tags: [Analytics]
      responses:
        '200': { description: OK }
        '403': { $ref: '#/components/responses/Forbidden' }

  /analytics/cost:
    get:
      summary: Cost breakdown by type vs. ceiling (`cost:view` permission — Super Admin/Admin/Sales Manager)
      tags: [Analytics]
      parameters:
        - { name: period, in: query, schema: { type: string, default: current } }
      responses:
        '200': { description: OK }
        '403': { $ref: '#/components/responses/Forbidden' }

  /settings/profile:
    get:
      summary: Own profile + preferences
      tags: [Settings]
      responses:
        '200': { description: OK }
    patch:
      summary: Update preferences (e.g. theme)
      tags: [Settings]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties: { theme: { type: string, enum: [light, dark] } }
      responses:
        '200': { description: OK }

  /team:
    get:
      summary: List team members (`team:manage` permission — Super Admin/Admin/Sales Manager)
      tags: [Settings]
      responses:
        '200':
          {
            description: OK,
            content:
              {
                application/json:
                  { schema: { type: array, items: { $ref: '#/components/schemas/TeamMember' } } },
              },
          }
        '403': { $ref: '#/components/responses/Forbidden' }
    post:
      summary: Invite a team member (`team:manage` permission — Super Admin/Admin/Sales Manager)
      tags: [Settings]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [email, role]
              properties:
                email: { type: string, format: email }
                role:
                  {
                    type: string,
                    enum: [super_admin, admin, sales_manager, developer, sales_executive, viewer],
                  }
      responses:
        '201': { description: Invited }
        '403': { $ref: '#/components/responses/Forbidden' }

  /team/{id}:
    patch:
      summary: Change role (Admin only)
      tags: [Settings]
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                {
                  role:
                    {
                      type: string,
                      enum: [super_admin, admin, sales_manager, developer, sales_executive, viewer],
                    },
                }
      responses:
        '200': { description: OK }
        '403': { $ref: '#/components/responses/Forbidden' }

  /search:
    get:
      summary: Global search across leads
      tags: [Search]
      parameters:
        - { name: q, in: query, required: true, schema: { type: string } }
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Lead' }

  /webhooks/clerk:
    post:
      summary: Clerk user/org event (signature-verified, no bearer auth)
      tags: [Authentication]
      security: []
      responses:
        '200': { description: Processed }

  /webhooks/vercel:
    post:
      summary: Deployment status callback (signature-verified, no bearer auth)
      tags: [Deployments]
      security: []
      responses:
        '200': { description: Processed }
```

---

**API architecture complete — deepens Doc 07, feeds directly into Phase 4 (Backend). Still awaiting your go-ahead for Phase 4 itself.**
