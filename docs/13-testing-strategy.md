# Testing Strategy — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-29

> **Scope change note:** Cross-tenant isolation testing removed (no tenant concept). Replaced with role-authorization testing. Billing webhook tests removed (no billing).
>
> **Doc-sync note (2026-07-29):** §3/§4 role examples updated to Module M3's implemented taxonomy; achieved in practice via `apps/api/test/rbac.e2e-spec.ts` (22 tests) plus 55 new unit tests across the guard/permission/audit layer. See DECISIONS.md D-029.

## 1. Philosophy

Test the things that are expensive to get wrong: role authorization, cost governance, and the AI pipeline's failure/retry behavior. Do not chase 100% coverage on trivial code.

## 2. Test Layers

| Layer         | Tooling                                    | Scope                                                                                                |
| ------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Unit          | Vitest                                     | Pure functions, service methods with mocked dependencies, zod schema validation, AI response parsers |
| Integration   | Vitest + NestJS Testing Module + Supertest | API endpoints against a real (test) Postgres instance, including auth guards and role checks         |
| E2E           | Playwright                                 | Critical dashboard user journeys end-to-end against a running staging-like environment               |
| AI regression | Custom eval harness (`packages/ai/evals`)  | Prompt-version snapshot tests against golden business inputs                                         |
| Contract      | zod schemas in `packages/shared-types`     | Shared between frontend and backend                                                                  |

## 3. Coverage Targets

- `apps/api` domain services (business logic): **80%+** line coverage, enforced in CI.
- Role-authorization code paths: **100%** — every guard branch explicitly tested, including negative cases (e.g. a Sales Executive or Viewer attempting an Admin/Sales-Manager-only action must fail — Module M3, `apps/api/test/rbac.e2e-spec.ts`).
- `apps/web` components: pragmatic coverage on logic-bearing components; no enforced number on purely presentational components.
- `packages/ai`: response parsers/validation at **80%+**; output quality is covered by the eval harness, not line-coverage percentage.

## 4. Critical Test Scenarios (must exist before Phase 8 / launch)

- **Role authorization:** A role without `team:manage`/`cost:view` cannot access Team management or Cost dashboard endpoints; permission-gated actions correctly reject callers lacking the required role, hierarchy level, or permission (Module M3).
- **Qualification gate:** Generation cannot be triggered on a lead that hasn't reached "Qualified" stage (PRD FR-4.1, AI Agent Architecture §1).
- **Async pipeline retry correctness:** A failed generation stage retries only that stage, does not duplicate prior stage output or double-charge AI cost.
- **Idempotency:** Repeated calls with the same `Idempotency-Key` on `generate`/`deploy`/`discover` endpoints do not create duplicate jobs.
- **Cost quota enforcement:** Exceeding a rep's or the org's usage ceiling correctly blocks further generation/discovery calls with the documented `429`/`QUOTA_EXCEEDED` response.
- **No auto-send:** Sales proposal endpoints never trigger an actual outbound message — verified explicitly, since this is a hard product/trust boundary (PRD FR-8.2).
- **Deployment E2E (staging):** A generated demo actually becomes reachable at a live URL through the real GitHub + Vercel integration, run as a scheduled staging smoke test.

## 5. CI Gate

`turbo run lint typecheck test` must pass on every PR before merge. E2E and AI regression suites run on merge to `main` and block promotion to `production` if failing.

## 6. Test Data & Environments

- Integration/unit tests run against an ephemeral test Postgres (Neon branch or local container) seeded with fixture data.
- AI-dependent tests use recorded/mocked provider responses for unit/integration layers; only the eval harness and scheduled staging smoke tests make real AI provider calls.

---

**Proceeding to Document 14 (Deployment Strategy).**
