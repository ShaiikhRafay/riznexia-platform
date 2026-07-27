# @riznexia/db

Prisma schema, migrations, and the generated client — the only package that talks to Postgres directly (Doc 12 §1).

## Current state

**`prisma/schema.prisma` is deliberately not created yet.** The full schema — all 12 active models, enums, indexes, and the commented-out Post-MVP models — is already designed and reviewed in [18-database-architecture.md §8](../../docs/18-database-architecture.md#8-prisma-schema). Creating it is the first task of Module M0's remaining work (Doc 21), not part of this tooling-only scaffolding pass, since a schema + migration is data-layer implementation, not configuration.

## Once the schema lands

```bash
pnpm --filter @riznexia/db generate      # regenerate the Prisma client after a schema change
pnpm --filter @riznexia/db migrate:dev   # create + apply a migration locally
pnpm --filter @riznexia/db studio        # browse data with Prisma Studio
```

Migration review and the expand/contract pattern are covered in [Doc 18 §9](../../docs/18-database-architecture.md#9-migration-strategy).
