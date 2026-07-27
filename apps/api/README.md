# @riznexia/api

NestJS backend API. Owns all business logic, tenant/role enforcement, database access, and orchestration triggers — see [Technical Architecture](../../docs/04-technical-architecture.md) and [API Architecture](../../docs/19-api-architecture.md).

## Current state

Scaffolding only (Doc 21, Module M0): bootstrap, root module, and a `/health` endpoint. No feature modules yet — those land per the module plan in [21-implementation-roadmap.md](../../docs/21-implementation-roadmap.md).

## Run locally

```bash
cp .env.example .env.local   # fill in real values, or leave DATABASE_URL pointing at docker-compose
docker compose up -d postgres redis   # from repo root, if using local services
pnpm --filter @riznexia/api dev
```

Health check: `GET http://localhost:3001/health`

## Structure

Feature modules will follow the pattern in [Coding Standards §2](../../docs/12-coding-standards.md): one module per bounded context (`discovery`, `leads`, `generation`, `deployment`, `pitch`, `team`, `auth`), each with its own controller/service/module/dto, plus `common/` for guards/interceptors/filters and `adapters/` for external I/O (Places, Claude, GitHub, Vercel).
