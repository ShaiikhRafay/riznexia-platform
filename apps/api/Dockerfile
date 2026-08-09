# Multi-stage build for apps/api (NestJS), run from the monorepo root:
#   docker build -f apps/api/Dockerfile -t riznexia-api .

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- deps: install full workspace deps (needed for turbo's dependency graph) ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile
# pnpm 9's default build-script gating skips @prisma/client's own postinstall
# (which runs `prisma generate`) unless explicitly approved, so a fresh
# Docker install silently ends up with an ungenerated/default client —
# generate it explicitly rather than relying on the postinstall hook.
RUN pnpm --filter @riznexia/db run generate

# ---- build: compile apps/api and its workspace dependencies ----
FROM base AS build
COPY --from=deps /repo ./
COPY . .
RUN pnpm turbo run build --filter=@riznexia/api...

# ---- runtime: minimal image, production deps only ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/node_modules ./node_modules
# pnpm gives each workspace package its own node_modules of symlinks into the
# root .pnpm store (already copied above) for its direct deps — without this,
# Node's module resolution from apps/api/dist/main.js can't find packages
# like reflect-metadata that aren't hoisted to the root node_modules.
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
# apps/api's own workspace dependencies (@riznexia/db, @riznexia/shared-types,
# @riznexia/ai, @riznexia/cache, @riznexia/logger, @riznexia/themes,
# @riznexia/website-generator, @riznexia/website-preview) are pnpm symlinks
# pointing at these sibling packages, not into the .pnpm store — the symlinks
# themselves get copied above, but their targets don't exist in this stage
# without copying the packages themselves (built dist output included).
COPY --from=build /repo/packages ./packages
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
