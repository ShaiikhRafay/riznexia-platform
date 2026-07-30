# @riznexia/web

Next.js (App Router) internal dashboard — see [UI/UX Design](../../docs/17-ui-ux-wireframes.md).

## Current state

Scaffolding only (Doc 21, pre-module Project Setup): root layout, a placeholder home page, and the design-token CSS variables from [Doc 17 §3](../../docs/17-ui-ux-wireframes.md#3-color-palette) wired into Tailwind. No real screens, auth, or data fetching yet.

## Run locally

```bash
cp .env.example .env.local   # fill in real values once apps/api and Clerk exist
pnpm --filter @riznexia/web dev
```

Runs at `http://localhost:3000`.

## Structure

Routes will follow [Doc 16 §5](../../docs/16-system-architecture.md#5-frontend-architecture)'s route map (`/discovery`, `/leads`, `/leads/[id]`, etc.) as each screen's module lands. Shared components come from `@riznexia/ui`; page-specific components stay colocated in their route folder until proven reusable (Doc 12 §3).
