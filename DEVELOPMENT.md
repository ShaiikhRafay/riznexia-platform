# Developer Guide

Onboarding for engineers joining this repo. If something here goes stale as the codebase grows, fix this file in the same PR — don't let it drift.

## Prerequisites

- Node.js 22 (see `.nvmrc` — use `nvm use` or your version manager of choice)
- pnpm 9+ (`corepack enable` will pick up the version pinned in `package.json`'s `packageManager` field)
- Docker (for local Postgres/Redis — optional if you point `DATABASE_URL` at a Neon dev branch instead, see [Doc 14 §2](docs/14-deployment-strategy.md#2-environments))

## First-time setup

```bash
git clone <repo-url>
cd riznexia-ai-website-factory
pnpm install
docker compose up -d              # local Postgres + Redis (skip if using Neon/Upstash dev instances)
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
# fill in real values for any service you're actively working against —
# everything else can stay blank until that module needs it
```

## Common commands

Run from the repo root (Turborepo fans these out to the relevant workspace packages):

| Command | What it does |
|---|---|
| `pnpm dev` | Runs `apps/web` and `apps/api` in watch mode, in parallel |
| `pnpm build` | Builds every app/package, respecting the dependency graph |
| `pnpm lint` | Lints every workspace (ESLint flat config, Doc 12) |
| `pnpm typecheck` | Type-checks every workspace |
| `pnpm test` | Runs unit/integration tests everywhere they exist |
| `pnpm format` | Formats the whole repo with Prettier |
| `pnpm --filter @riznexia/api dev` | Run a single workspace's script (swap the package name) |

Every one of these is also what CI runs on every PR ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) — if it's green locally, it should be green in CI.

## Git workflow

Trunk-based development, short-lived feature branches, Conventional Commits, squash-merge to `main`. Full detail: [Doc 11 — Git Strategy](docs/11-git-strategy.md). In short:

```bash
git checkout -b feature/short-description
# ... commit as feat(scope): description, fix(scope): description, etc. ...
# open a PR into main, referencing the PRD FR-ID(s) it implements
```

Pre-commit hook (Husky + lint-staged) runs ESLint `--fix` and Prettier on staged files automatically — you shouldn't need to run `pnpm format` manually before committing in normal use.

## Where things go

- **New backend feature?** A NestJS module under `apps/api/src/<context>/`, following the bounded contexts in [Doc 16 §3](docs/16-system-architecture.md#3-service-boundaries) (`discovery`, `leads`, `generation`, `deployment`, `pitch`, `team`, `auth`). Business logic in services, never controllers (Doc 12 §2).
- **New dashboard screen?** A route under `apps/web/app/`, matching the route map in [Doc 16 §5](docs/16-system-architecture.md#5-frontend-architecture). Shared components go in `packages/ui`; keep page-specific ones colocated until they're genuinely reused.
- **New shared type/contract?** `packages/shared-types` — this is the only source of truth both `web` and `api` should import from; never duplicate a DTO shape by hand in both apps.
- **New AI agent?** `packages/ai`, behind the `AiService` gateway — see [Doc 20](docs/20-ai-agents-architecture.md) for the full agent catalog and [Doc 16 §7](docs/16-system-architecture.md#7-ai-layer) for the gateway's internal shape. No feature code should call an AI provider directly.
- **Schema change?** `packages/db/prisma/schema.prisma` (not created yet — see [`packages/db/README.md`](packages/db/README.md)), reviewed in the same PR as its migration, following the expand/contract pattern ([Doc 18 §9](docs/18-database-architecture.md#9-migration-strategy)).

## Environment variables

Each app has its own `.env.example` (`apps/api/.env.example`, `apps/web/.env.example`) documenting every variable and which doc explains it. Never commit a real `.env.local`. `NEXT_PUBLIC_*` vars in `apps/web` are exposed to the browser — never put a secret behind that prefix.

## What's scaffolding vs. what's real right now

This repo currently contains tooling/config only (Module M0's non-business-logic slice): monorepo wiring, lint/format/CI, Docker, and app skeletons with a single `/health` endpoint and a placeholder home page. No auth, no database schema, no feature modules yet. Follow [Doc 21 — Implementation Roadmap](docs/21-implementation-roadmap.md) for what lands next and in what order.
