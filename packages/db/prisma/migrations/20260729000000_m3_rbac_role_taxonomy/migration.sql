-- Module M3 — RBAC role taxonomy (DECISIONS.md D-023).
-- Hand-authored incremental migration: `prisma migrate diff --from-migrations`
-- needs a live/shadow database to compute the prior state, which this
-- environment doesn't have (same constraint as the M2 init migration,
-- DECISIONS.md D-020). Written by inspecting the exact enum delta between
-- the previous migration and the current schema.prisma instead.
--
-- ADMIN is unchanged. MANAGER -> SALES_MANAGER and SALES_REP -> SALES_EXECUTIVE
-- are renames (existing rows keep their role, just relabeled). SUPER_ADMIN,
-- DEVELOPER, and VIEWER are net-new values with no existing rows to migrate.
--
-- Safe to run as a single transaction: PostgreSQL only forbids using a
-- newly-`ADD VALUE`'d enum member within the same transaction it was added
-- in (e.g. an INSERT referencing it) — this migration only adds/renames
-- enum labels and changes a column default to an already-renamed value, it
-- never references SUPER_ADMIN/DEVELOPER/VIEWER as data.

-- AlterEnum
ALTER TYPE "TeamRole" ADD VALUE 'SUPER_ADMIN' BEFORE 'ADMIN';
ALTER TYPE "TeamRole" RENAME VALUE 'MANAGER' TO 'SALES_MANAGER';
ALTER TYPE "TeamRole" ADD VALUE 'DEVELOPER' AFTER 'SALES_MANAGER';
ALTER TYPE "TeamRole" RENAME VALUE 'SALES_REP' TO 'SALES_EXECUTIVE';
ALTER TYPE "TeamRole" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "team_members" ALTER COLUMN "role" SET DEFAULT 'SALES_EXECUTIVE';
