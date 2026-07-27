# Riznexia AI Sales Platform

Internal tool for Riznexia employees: discovers local businesses without a website, generates a real AI demo site for them, deploys it live, and tracks the sales pipeline. See [Product Vision](docs/01-product-vision.md) for the full picture — there is no customer-facing or external-user surface anywhere in this system.

## Status

Documentation (Phases 1–3 of the project roadmap) is complete — see [`/docs`](docs) for the full set: product/business docs, system/database/API/AI-agent architecture, UI/UX wireframes, and the [implementation roadmap](docs/21-implementation-roadmap.md). This repository currently holds **tooling scaffolding only** (Module M0, minus business logic) — no feature modules yet.

## Monorepo layout

```
apps/
  web/            Next.js internal dashboard
  api/             NestJS backend API
  site-template/   Scaffold for generated demo sites (not deployed from here)
packages/
  ui/              Shared dashboard components
  shared-types/    Cross-app TypeScript types + zod schemas
  ai/              AiService gateway, prompt registry
  db/              Prisma schema + migrations
  cache/           Redis client wrapper
  logger/          Structured logging wrapper
  config-eslint/   Shared ESLint flat configs
  config-typescript/ Shared tsconfig bases
docs/              Full documentation set (product, architecture, roadmap)
```

Full rationale in [Doc 05 — Monorepo Structure](docs/05-monorepo-structure.md).

## Quick start

See [DEVELOPMENT.md](DEVELOPMENT.md) for full onboarding. Short version:

```bash
pnpm install
docker compose up -d          # local Postgres + Redis
pnpm dev                      # runs apps/web + apps/api in parallel
```

## Documentation index

| Area | Doc |
|---|---|
| Product | [Vision](docs/01-product-vision.md), [BRD](docs/02-brd.md), [PRD](docs/03-prd.md) |
| Architecture | [Technical Architecture](docs/04-technical-architecture.md), [System Architecture (deep)](docs/16-system-architecture.md) |
| Data | [Database Design](docs/06-database-design.md), [Database Architecture (deep)](docs/18-database-architecture.md) |
| API | [API Specifications](docs/07-api-specifications.md), [API Architecture (deep)](docs/19-api-architecture.md) |
| AI | [AI Agent Architecture](docs/09-ai-agent-architecture.md), [AI Agents (deep)](docs/20-ai-agents-architecture.md) |
| Design | [UI/UX Wireframes](docs/17-ui-ux-wireframes.md) |
| Process | [Roadmap](docs/10-development-roadmap.md), [Implementation Roadmap](docs/21-implementation-roadmap.md), [Git Strategy](docs/11-git-strategy.md), [Coding Standards](docs/12-coding-standards.md), [Testing](docs/13-testing-strategy.md), [Deployment](docs/14-deployment-strategy.md), [Security](docs/15-security-strategy.md) |

## License

Proprietary — internal Riznexia use only.
