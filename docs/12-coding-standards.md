# Coding Standards — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-27

> **Scope change note:** Tenant-scoping requirement replaced with role-authorization requirement (no tenant concept in this system — see Technical Architecture §5).

## 1. General

- TypeScript **strict mode** everywhere; `any` is a lint error (escape hatch: explicit `unknown` + narrowing, or a documented exception with a one-line reason).
- Shared ESLint (`packages/config-eslint`) and Prettier config across all apps/packages.
- No default exports for components/services (named exports only).
- Absolute imports via workspace package names (`@riznexia/ui`, `@riznexia/shared-types`) rather than deep relative paths across package boundaries.

## 2. NestJS (`apps/api`) Conventions

- Feature-module structure: one module per domain area (`discovery`, `leads`, `generation`, `deployment`, `pitch`, `team`, `auth`), each with its own `*.controller.ts`, `*.service.ts`, `*.module.ts`, `dto/`.
- **Role/permission authorization is not optional per-endpoint logic** — a global guard attaches the authenticated `team_member` (id + role) from the validated Clerk JWT to the request context; role- or permission-restricted endpoints (team management, cost dashboard) declare requirements via decorator (`@Roles()`, `@MinRole()`, `@RequirePermissions()` — Module M3), checked centrally by the corresponding guard, not via ad hoc `if` checks scattered in handlers.
- Business logic lives in services, never in controllers.
- All external I/O (Google Places, Claude, GitHub, Vercel) goes through a dedicated provider class per integration, injected via DI — never called ad hoc from a service.
- Async pipeline steps are Trigger.dev tasks defined alongside the module they belong to (e.g., `discovery/discovery.tasks.ts`), not scattered in a generic "jobs" folder.

## 3. Next.js (`apps/web`) Conventions

- App Router, server components by default; `"use client"` only where interactivity genuinely requires it (forms, live status polling).
- Data fetching: server components fetch directly where possible; client-side interactive state uses TanStack Query against the NestJS API.
- Route structure mirrors the resource model: `/leads`, `/leads/[id]`, `/leads/[id]/websites/[id]`, etc.
- Shared UI comes from `packages/ui`; one-off page-specific components stay colocated in the route folder.
- **No rich-text/WYSIWYG editor component is ever added to this app** — this is a deliberate product boundary (PRD non-goal), not an oversight; a PR introducing one should be rejected in review.

## 4. `packages/ai` Conventions

- Every prompt template is a versioned, named export — no inline prompt strings inside `apps/api` business logic.
- Every provider adapter implements a common interface (`AiTextProvider`, `AiImageProvider`).
- All AI responses are parsed through a zod schema before leaving the package.

## 5. Error Handling

- Domain errors are typed exceptions (e.g., `LeadNotFoundException`, `QuotaExceededException`) mapped to the API error envelope by a global NestJS exception filter.
- Never silently swallow an error in an async pipeline step — a failed Trigger.dev task must surface as a `failed` status on its `generation_job`/`deployment` row.
- No error handling for conditions that cannot occur given TypeScript's type guarantees — validate only at true external boundaries.

## 6. Comments & Documentation

- Code should be self-documenting via naming; comments explain **why**, not **what**.
- No multi-paragraph docstrings. Public package APIs get a one-line JSDoc summary where the name alone doesn't make usage obvious.

## 7. Formatting & Linting Enforcement

- Prettier + ESLint run as a pre-commit hook (lint-staged) and again as a required CI check.

---

**Proceeding to Document 13 (Testing Strategy).**
