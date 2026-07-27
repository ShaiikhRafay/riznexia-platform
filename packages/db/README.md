# @riznexia/db

Prisma schema, migrations, and the generated client — the only package that talks to Postgres directly (Doc 12 §1).

## Schema

`prisma/schema.prisma` holds all 12 active models from [Doc 18](../../docs/18-database-architecture.md#8-prisma-schema) plus 6 Post-MVP models kept as commented-out design intent (never migrated — see Doc 18 §10).

```bash
cp .env.example .env                     # or rely on a workspace-level DATABASE_URL
pnpm --filter @riznexia/db generate      # regenerate the Prisma client after a schema change
pnpm --filter @riznexia/db migrate:dev   # create + apply a migration locally
pnpm --filter @riznexia/db seed          # seed fixture team members (local/staging only)
pnpm --filter @riznexia/db studio        # browse data with Prisma Studio
```

Migration review and the expand/contract pattern are covered in [Doc 18 §9](../../docs/18-database-architecture.md#9-migration-strategy). No migration has been generated yet — that requires a reachable Postgres instance (local via `docker compose up -d postgres`, or a Neon dev branch).

## Usage from another package

```ts
import { prisma, TeamRole } from '@riznexia/db';

const admins = await prisma.teamMember.findMany({ where: { role: TeamRole.ADMIN } });
```

`prisma` is a lazily-instantiated singleton (`src/client.ts`) — never construct a second `PrismaClient` elsewhere in the codebase (Doc 16 §8 connection pooling).
