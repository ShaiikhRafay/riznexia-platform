# Monorepo Structure — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-27

> **Scope change note:** No billing module, no client-portal app. `apps/api` module list updated to drop billing/client-facing concerns.

## 1. Tooling

- **Package manager:** pnpm (workspaces).
- **Build orchestration:** Turborepo.
- **Language:** TypeScript everywhere (strict mode), single version pinned at the root.
- **Node version:** managed via `.nvmrc` / Volta, pinned to current Node LTS.

## 2. Top-Level Layout

```
riznexia-ai-website-factory/
├── apps/
│   ├── web/                 # Next.js internal dashboard (Vercel) — Riznexia employees only
│   ├── api/                 # NestJS backend API (Railway)
│   └── site-template/       # Base Next.js template used to scaffold generated demo sites
├── packages/
│   ├── ui/                  # Shared React component library (shadcn/ui-based) for the internal dashboard
│   ├── shared-types/        # Shared TypeScript types/interfaces + zod schemas
│   ├── ai/                  # AiService client, prompt templates, provider adapters
│   ├── config-eslint/       # Shared ESLint config
│   ├── config-typescript/   # Shared tsconfig base(s)
│   └── db/                  # Prisma schema, migrations, generated client (consumed by apps/api)
├── docs/                    # This documentation suite
├── .github/
│   └── workflows/           # CI/CD pipelines
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## 3. App/Package Responsibilities

### `apps/web`
Next.js App Router internal dashboard. Consumes `packages/ui`, `packages/shared-types`. Talks to `apps/api` over REST. Access restricted to authenticated Riznexia employees (Clerk, domain-restricted).

### `apps/api`
NestJS application, structured as feature modules: `discovery`, `leads`, `generation`, `deployment`, `pitch` (AI outreach drafting), `team` (internal accounts/roles), `auth`. **No `billing` or `clients`-as-portal module** — there is nothing to bill and no external client entity with its own access.

### `apps/site-template`
Template/scaffold used by the generation pipeline to produce each demo site's codebase before it's pushed to its own dedicated GitHub repo. Not deployed from this monorepo itself — deployed per-lead as a build artifact (Technical Architecture §6).

### `packages/ui`
Shared, themeable component library for the *internal dashboard only*. Built on Tailwind CSS + shadcn/ui + Radix primitives.

### `packages/shared-types`
Single source of truth for types shared between `web` and `api`.

### `packages/ai`
The `AiService` client: provider adapters (Claude, image-gen), prompt template management, response parsing/validation.

### `packages/db`
Prisma schema (see Database Design), migrations, generated Prisma client. `apps/api` is the only runtime consumer.

### `packages/config-eslint`, `packages/config-typescript`
Shared lint/tsconfig bases.

## 4. Dependency Rules

- `apps/*` may depend on `packages/*`, never the reverse.
- `packages/*` depend on other `packages/*` in one direction only (no cycles).
- `apps/web` never imports directly from `apps/api` — contracts flow through `packages/shared-types`.
- `apps/site-template` has no dependency on `packages/ui` or `apps/api` — generated demo sites are standalone deployable Next.js apps.

## 5. Turborepo Pipeline

Standard tasks per package (`build`, `lint`, `test`, `typecheck`, `dev`), Turborepo-cached. CI runs `turbo run lint typecheck test build` against the whole graph.

## 6. Environment Configuration

- Each app has its own `.env.local` (gitignored) plus a committed `.env.example`.
- Shared, non-secret config lives in `packages/shared-types` as typed constants.
- Secrets managed via Railway/Vercel/GitHub Actions secret stores (Security Strategy) — no Stripe keys anywhere in this system.

---
**Proceeding to Document 6 (Database Design).**
