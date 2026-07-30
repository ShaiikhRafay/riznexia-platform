# Security Strategy — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-29

> **Scope change note:** "Multi-Tenant Data Isolation" section replaced with "Role-Based Access Control" (no tenants). All billing/PCI content removed (no billing exists). Added explicit note restricting sign-up to Riznexia's own domain.
>
> **Doc-sync note (2026-07-29):** §1–§2 updated for Module M3's implemented RBAC: six roles (not three), a role hierarchy, and a fine-grained permission matrix — Clerk's authentication scope is unchanged (this was already correct and remains the architecture, confirmed rather than revised when M3's brief initially proposed replacing it — DECISIONS.md D-023). §8's audit-logging claim corrected to match what's actually built. See DECISIONS.md D-029.

## 1. Authentication & Authorization

- **AuthN:** Clerk handles all employee authentication, restricted to Riznexia's email domain — **invite-only, no public sign-up**. No custom password handling anywhere in our code. This stays the architecture as of Module M3: a brief proposing a self-rolled JWT/refresh-token/password system was explicitly declined in favor of keeping Clerk (DECISIONS.md D-023) — Module M3 built authorization only, not a parallel credential system.
- **AuthZ:** Role- and permission-based (`super_admin`, `admin`, `sales_manager`, `developer`, `sales_executive`, `viewer` — Database Design §3 `team_member.role`, Module M3). A global NestJS guard chain resolves `{ teamMemberId, role }` from the validated Clerk JWT on every request, then applies three independent checks in sequence: an exact-role-list check, a role-hierarchy ("at least this seniority") check, and a fine-grained permission check (System Architecture §15). E.g., only Super Admin/Admin/Sales Manager hold the `team:manage`/`cost:view` permissions needed to manage team accounts or view the cost dashboard.
- Service-to-service calls (Trigger.dev tasks calling back into the API) use a separate, narrowly-scoped internal service credential — never the end-user's JWT.

## 2. Role-Based Access Control (replaces multi-tenancy)

There is no tenant boundary in this system — all data belongs to Riznexia. The security-relevant boundary is **role and permission**, not tenant:

- Enforced at the application layer via a global guard chain + per-endpoint decorators (`@Roles()`, `@MinRole()`, `@RequirePermissions()` — Coding Standards §2, Module M3).
- Explicitly tested: a role lacking the required permission or hierarchy level for a gated action must fail with `403 FORBIDDEN` (Testing Strategy §4; `apps/api/test/rbac.e2e-spec.ts` proves the full guard chain end-to-end).
- Lead visibility is org-wide by default (any authenticated employee with `leads:read`, which every role currently holds, can see any lead) — this is a deliberate simplification appropriate for a small internal sales team, revisited only if Riznexia's sales org structure later requires stricter partitioning (Technical Architecture §10).
- **Organization/multi-tenant readiness:** the schema has a documented, currently-inactive attachment point (`Organization`, commented out) for if this is ever revisited — not built, not a current requirement (Database Architecture §10, DECISIONS.md D-027).

## 3. Secrets Management

- No secret (API key, DB credential, signing secret) is ever committed to the repository — enforced by a pre-commit secret-scanning hook and a CI secret-scan step (e.g., gitleaks) as a backstop.
- Secrets are stored exclusively in Vercel/Railway/GitHub Actions native secret stores, scoped per environment.
- All third-party credentials in this system (Anthropic, Google Places, image-gen, GitHub, Vercel, Clerk) are Riznexia's own platform-level credentials — there are no per-customer credentials to manage, since there are no external customers.

## 4. Input Validation & Injection Prevention

- All API input validated against zod/class-validator schemas at the boundary — no raw request body reaches business logic unvalidated.
- Prisma's parameterized queries prevent SQL injection by construction; no raw SQL string concatenation permitted.
- AI prompt construction uses structured, delimited input sections (AI Agent Architecture §4) to reduce prompt-injection risk from untrusted third-party text (Google review content, business names).
- Generated demo content is rendered as data (structured content blocks into fixed template components), never as raw HTML/script — AI output cannot introduce XSS into a generated demo site.

## 5. Rate Limiting & Abuse Prevention

- Per-rep and global quotas on discovery/generation/deployment endpoints (API Specifications §4, AI Agent Architecture §6) — protects internal cost and prevents runaway usage.
- Global IP-based rate limiting as a baseline against credential-stuffing on the login surface, though exposure is limited given internal-only, domain-restricted access.
- Webhook endpoints (`/webhooks/clerk`, `/webhooks/vercel`) verify provider signatures on every request; unsigned or invalid-signature requests are rejected before any processing.

## 6. Third-Party API Key Handling

- Google Places, Anthropic, image-gen, GitHub, and Vercel API keys are platform-level secrets (Riznexia's own accounts) — a single, auditable choke point per credential, accessed only through its dedicated provider class (Coding Standards §2).

## 7. Data Handling & Retention

- Lead data sourced from Google Places (business name, address, reviews, photos) is business-public information. Any contact info captured for outreach is handled with reasonable care but is not classified as sensitive personal data of a private individual (it is business contact information).
- Data retention: soft-deleted lead/website records are excluded from all normal reads immediately; a scheduled hard-delete purge runs after a defined retention window (default 90 days).
- No lead data is used to train or fine-tune any AI model — API calls to Anthropic/image providers use standard API terms (no training on API inputs), confirmed against each provider's current data-usage policy.

## 8. OWASP Top 10 — Applied Posture

| Risk                             | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Broken access control            | Role-based authorization by construction (§2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Injection                        | Parameterized queries, schema-validated input, structured AI prompts (§4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Cryptographic failures           | TLS everywhere (Vercel/Railway default), encrypted secrets, no custom crypto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Insecure design                  | Human-review gates and cost governance designed in from Doc 1 onward                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Security misconfiguration        | Infra-as-config via managed platforms, secret scanning in CI, no manual server hardening surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Vulnerable/outdated components   | Automated dependency update PRs (Dependabot/Renovate) reviewed under normal PR process                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Auth/identity failures           | Delegated to Clerk, domain-restricted invite-only sign-up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Software/data integrity failures | CI-gated deploys only, signed webhook verification, no unsigned third-party code execution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Logging/monitoring failures      | Trigger.dev pipeline observability + deployment alerts; privileged actions are recorded to the append-only `audit_log` table on success via an opt-in `@Audited()` decorator (Module M3, Database Architecture §6). Auth/permission-check _denials_ are not yet separately audit-logged — they currently surface only as standard `401`/`403` responses (and whatever the hosting platform's access logs capture), not as a queryable `audit_log` row. Closing that gap is a candidate for the Observability & Hardening backlog item (docs/21-implementation-roadmap.md §5), not silently claimed as already done. |
| SSRF                             | External calls restricted to explicit, allow-listed provider integrations (§6) — no user-controllable arbitrary outbound URL fetching                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## 9. Compliance Posture

No regulated data classes (health records, payment card data) are processed by this system — there is no billing surface and no card data ever touches it. This is an internal operational tool; formal external compliance certification is not applicable at this scope.

---

**All 15 documents are now revised for the internal-tool scope.**
