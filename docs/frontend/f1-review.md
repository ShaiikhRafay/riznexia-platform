# Module Review Report — F1: Foundation (Frontend)

**Status:** Module F1 implementation complete, pending founder approval.
**Date:** 2026-08-04
**Reviewed against:** the founder's F1 module brief (build the complete application foundation preparing everything required by every later frontend module — folder structure, routing, authentication flow, protected/public routes, layout architecture including sidebar/header, theme system, state management, API client, query client, error handling, loading strategy, toast system, form/validation strategy, component architecture, shared UI package usage, responsive breakpoints, dark mode, environment variables, build configuration — on the frozen stack [Next.js 15 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui, Lucide, minimal Framer Motion, TanStack Query, React Hook Form, Zod], consuming the existing, frozen backend APIs only, no backend contract changes), given directly, followed by a full architecture proposal and its approval before any code was written. `docs/21-implementation-roadmap.md` — the backend roadmap — is untouched, as it always has been; F1 does not rename, merge, split, or reorder any backend module.

---

## 1. Scope Compliance

| Requirement                                          | Delivered | Where                                                                                                                       |
| ---------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Folder structure (feature-first, Clean Architecture) | ✅        | `app/` routing-only, `src/{lib,components,features}` — DECISIONS.md D-115                                                   |
| Routing                                              | ✅        | App Router route groups `(auth)`/`(dashboard)`, nested `leads/[leadId]/*` mirroring the backend's own `leads/:id/*` nesting |
| Authentication flow                                  | ✅        | `@clerk/nextjs`, `middleware.ts`, `(auth)` hosted sign-in/sign-up — DECISIONS.md D-115                                      |
| Protected routes                                     | ✅        | Two-layer gate: `middleware.ts` (session exists) + `(dashboard)/layout.tsx` (`GET /me`, real `TeamMember` exists)           |
| Public routes                                        | ✅        | `(auth)/sign-in`, `(auth)/sign-up` only                                                                                     |
| Layout architecture (sidebar/header)                 | ✅        | `AppShell`, `Sidebar`/`MobileSidebar`, `Header`                                                                             |
| Theme system                                         | ✅        | `next-themes`, dark default, both modes independently tuned — DECISIONS.md D-117                                            |
| State management                                     | ✅        | TanStack Query for server state; no client-state library added (none needed yet)                                            |
| API client                                           | ✅        | `apiClient` (`src/lib/api-client.ts`), `ApiError` mirrors the backend envelope exactly                                      |
| Query client                                         | ✅        | `createQueryClient()` factory, per-request instance                                                                         |
| Error handling                                       | ✅        | `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, inline `<ErrorState/>` — three distinct layers                |
| Loading strategy                                     | ✅        | `(dashboard)/loading.tsx`, `Skeleton` — skeletons not spinners, per `docs/17` §18                                           |
| Toast system                                         | ✅        | `Toaster`/`toast` (sonner-based, wrapped once in `packages/ui`)                                                             |
| Form strategy                                        | ✅        | `Form`/`FormField`/`FormItem`/`FormControl`/`FormMessage` (RHF)                                                             |
| Validation strategy                                  | ✅        | Zod via `@hookform/resolvers/zod`, reusing `@riznexia/shared-types` schemas where they exist                                |
| Component architecture                               | ✅        | `packages/ui` (generic) → `src/components` (app-shell-specific) → `src/features/*` (per-feature, none populated yet)        |
| Shared UI package usage                              | ✅        | `packages/ui` populated for the first time this module                                                                      |
| Responsive breakpoints                               | ✅        | Tailwind v4 defaults, reconciled onto `docs/17` §8's behavior spec                                                          |
| Dark mode                                            | ✅        | Default dark, both modes first-class — DECISIONS.md D-117                                                                   |
| Environment variables                                | ✅        | `NEXT_PUBLIC_API_BASE_URL` (Zod-validated at boot), Clerk's own `NEXT_PUBLIC_CLERK_*`/`CLERK_SECRET_KEY`                    |
| Build configuration                                  | ✅        | `transpilePackages`, shared `config-typescript`/`config-eslint`, Tailwind v4 CSS-first `@theme`                             |
| **Login Page**                                       | ✅        | Clerk's hosted `<SignIn/>`, themed — DECISIONS.md D-115                                                                     |
| **Layout**                                           | ✅        | `AppShell`                                                                                                                  |
| **Sidebar**                                          | ✅        | `Sidebar`/`MobileSidebar`/`SidebarNav`                                                                                      |
| **Header**                                           | ✅        | `Header`, `Breadcrumb`, `GlobalSearch`, `UserMenu`                                                                          |
| **Route Guards**                                     | ✅        | Middleware + layout, two layers                                                                                             |
| **shadcn/ui setup**                                  | ✅        | Hand-built primitives on Radix + CVA in `packages/ui`                                                                       |
| **Tailwind setup**                                   | ✅        | v4, CSS-first, no `tailwind.config.ts`                                                                                      |
| **Error Pages**                                      | ✅        | error/global-error/not-found                                                                                                |
| Unit tests                                           | ✅        | 12 `packages/ui` + 22 `apps/admin-web` lib = 34                                                                             |
| Integration tests                                    | ✅        | 14 `apps/admin-web` component/page compositions                                                                             |
| Documentation                                        | ✅        | TASKS.md, CHANGELOG.md, DECISIONS.md (D-115 through D-121), this report                                                     |
| No backend changes                                   | ✅        | Verified — zero files under `apps/api`/`packages/db` touched (§2)                                                           |
| No F2-F15 business logic                             | ✅        | Every route renders `<FeaturePlaceholder/>` — DECISIONS.md D-120                                                            |

## 2. Backend-Frozen Boundary — Verified, Not Assumed

Per the founder's explicit "backend is complete and frozen... do not change backend contracts," this was verified directly rather than merely intended:

```
git status --short apps/api packages/db
```

returns nothing beyond what was already modified in prior (M10-M12) sessions before F1 began — **zero files under `apps/api` or `packages/db` were touched by this module.** The one shared-tooling file this module did extend, `packages/config-eslint/nextjs.js`, is frontend build tooling, not a backend module; the change is three additive entries recognizing three more framework-mandated default-export files (DECISIONS.md D-121), re-verified afterward via a full `pnpm lint` sweep showing zero change in outcome for `apps/api` or any other non-frontend package.

Every API call this module makes targets an endpoint that already exists in the v1.0 inventory (`docs/35-v1.0-architecture-review.md` §4) — `GET /me` (auth layer) and `GET /leads?q=` (global search's navigation target, using the backend's real `q` parameter from `listLeadsQuerySchema`, not an invented `search` param). No new endpoint, no new request/response shape, no modified permission was requested or assumed.

## 3. Pre-Implementation Architecture Review

A complete architecture was presented covering all 22 items the founder's brief named, grounded in the actual frozen backend (verified: `ClerkAuthGuard`'s Bearer-JWT flow, the exact `{error:{code,message,details}}` envelope, the full 73-endpoint/27-permission/6-role inventory from the v1.0 review) rather than the backend as originally planned — and in the pre-existing `docs/08`/`docs/17` design system (color/type/spacing tokens, component inventory, accessibility/animation rules), re-mapped onto the founder's frozen F1-F15 module list since those docs predate M10-M12 and described a coarser screen list. Four items were flagged explicitly as judgment calls open to override, all approved as proposed:

- **Sidebar nav-visibility** (§6 of the architecture) — resolved by building a small, admin-web-local, presentation-only role table rather than either duplicating the backend's 27-permission matrix or reaching into `apps/api` for it (both prohibited) — DECISIONS.md D-116.
- **Theme persistence** (§8) — resolved as client-only, a flagged deviation from `docs/17`'s "sync via `team_member`" aspiration, since the frozen `TeamMember` model has no such column — DECISIONS.md D-117.
- **Breakpoint reconciliation** (§15) — resolved by adopting Tailwind v4's default scale rather than `docs/17`'s slightly different custom numbers, mapping sidebar/content behavior onto `lg`/`2xl`.
- **`apps/web` vs `apps/admin-web` naming** — resolved by building a new `apps/admin-web` and leaving the pre-existing `apps/web` scaffold untouched, flagged for the founder's confirmation rather than assumed — DECISIONS.md D-115.

Full reasoning: `DECISIONS.md` D-115 through D-121.

## 4. Implementation Summary

**`packages/ui/src/`:** `lib/utils.ts` (`cn()`); `components/` — `button.tsx`, `input.tsx`, `label.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `skeleton.tsx`, `separator.tsx`, `tooltip.tsx` (shadcn primitives on Radix + CVA), `form.tsx` (RHF/Zod integration — `Form`/`FormField`/`FormItem`/`FormControl`/`FormLabel`/`FormDescription`/`FormMessage`), `toaster.tsx` (sonner wrapper + `toast` re-export), `error-state.tsx` (backend-envelope-shaped, code-aware presentation); `index.ts` barrel export.

**`apps/admin-web/src/lib/`:** `env.ts` (Zod-validated `NEXT_PUBLIC_API_BASE_URL`), `api-client.ts` (`apiClient`, `ApiError`), `query-client.ts` (`createQueryClient()`), `auth.ts` (`NAV_ITEMS`, `visibleNavItems()`, `isNavItemVisible()`).

**`apps/admin-web/src/components/`:** `providers.tsx` (ThemeProvider + QueryClientProvider + TooltipProvider + Toaster, client-only); `layout/` — `app-shell.tsx`, `sidebar.tsx`, `mobile-sidebar.tsx`, `sidebar-nav.tsx` (shared by both), `header.tsx`, `breadcrumb.tsx`, `global-search.tsx`, `theme-toggle.tsx`, `user-menu.tsx`, `not-provisioned.tsx`; `shared/feature-placeholder.tsx`.

**`apps/admin-web/app/`:** `layout.tsx` (root — `ClerkProvider`, fonts, `Providers`), `globals.css` (Tailwind v4 `@theme` + design tokens), `error.tsx`, `global-error.tsx`, `not-found.tsx`; `(auth)/layout.tsx` + `sign-in/[[...sign-in]]`/`sign-up/[[...sign-up]]`; `(dashboard)/layout.tsx` (the `GET /me` gate), `(dashboard)/loading.tsx`, and eight placeholder route pages (`page.tsx`, `discovery/`, `leads/`, `crm/`, `analytics/`, `team/`, `settings/`, `profile/`).

**`middleware.ts`:** `clerkMiddleware` + `createRouteMatcher`, protecting everything except `(auth)/*`.

**Build config:** `next.config.mjs` (`transpilePackages`), `postcss.config.mjs` (`@tailwindcss/postcss`), `tsconfig.json`/`eslint.config.mjs` extending the existing shared configs unchanged.

**One real, production-build-only bug found and fixed, not merely hypothetical (DECISIONS.md D-119):** `packages/ui`'s `Form` component broke Next's React Server Components bundling the moment any Server Component imported anything from the `@riznexia/ui` barrel — `react-hook-form`'s `react-server` export condition build lacks `FormProvider`/`Controller`/`useFormContext` entirely, and Next evaluates a barrel's whole module graph for any single import from it. Invisible to `typecheck`, `lint`, and the full unit/integration test suite — caught only by running a real `next build`. Fixed by adding `'use client'` to every Radix/RHF-wrapping component in the package (ten files), not just `form.tsx`.

## 5. Test Coverage

| Suite                                                       | Tests | Notes                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui` — `button.test.tsx`                           | 4     | Click forwarding, loading state disables + spinner + preserves width, explicit `disabled`, `asChild` renders the child element not a nested button                                                                                                    |
| `packages/ui` — `error-state.test.tsx`                      | 4     | Known-code presentation, unmapped module-specific code still shows the backend message, no-code fallback, retry callback                                                                                                                              |
| `packages/ui` — `form.test.tsx`                             | 2     | End-to-end RHF+Zod: invalid submission blocked with the Zod message shown and `aria-invalid`, valid submission passes parsed values and clears the error                                                                                              |
| `packages/ui` — `toaster.test.tsx`                          | 2     | Renders its notification region, `toast` re-export shape                                                                                                                                                                                              |
| `apps/admin-web` — `env.test.ts`                            | 3     | Valid config, missing var throws at import time, malformed URL throws                                                                                                                                                                                 |
| `apps/admin-web` — `api-client.test.ts`                     | 9     | GET/POST wiring, Bearer token attach/omit, 204 handling, non-JSON (CSV) body parsing, backend error envelope → `ApiError`, unrecognized error body → `UNKNOWN_ERROR`, network rejection → `NETWORK_ERROR`, dev-only schema-drift warning never throws |
| `apps/admin-web` — `query-client.test.ts`                   | 4     | Fresh instance per call, 4xx never retried, network/5xx retried twice, mutations never retried                                                                                                                                                        |
| `apps/admin-web` — `auth.test.ts`                           | 6     | Every role/nav-item combination cross-checked against the intended visibility table                                                                                                                                                                   |
| `apps/admin-web` — `sidebar-nav.test.tsx` (integration)     | 4     | Full nav for admin, Team/Settings/CRM hidden from viewer, active-link `aria-current`, `onNavigate` fires                                                                                                                                              |
| `apps/admin-web` — `breadcrumb.test.tsx` (integration)      | 3     | Root, nested-route match, unmatched-path fallback                                                                                                                                                                                                     |
| `apps/admin-web` — `global-search.test.tsx` (integration)   | 2     | Navigates to `/leads?q=` on Enter, blocks sub-2-character terms (matches `listLeadsQuerySchema`'s `min(2)`)                                                                                                                                           |
| `apps/admin-web` — `not-provisioned.test.tsx` (integration) | 2     | Message content, sign-out action present                                                                                                                                                                                                              |
| `apps/admin-web` — `app/error.test.tsx` (integration)       | 2     | Crash fallback renders, `reset()` fires                                                                                                                                                                                                               |
| `apps/admin-web` — `app/not-found.test.tsx` (integration)   | 1     | Link back to `/`                                                                                                                                                                                                                                      |

**Totals:** `packages/ui` 12/12. `apps/admin-web` 36/36 (22 unit + 14 integration). **48 F1 frontend tests, all passing.** Full monorepo sweep (`pnpm typecheck`/`lint`/`test` across every package, plus a real `pnpm --filter @riznexia/admin-web build`) clean; `apps/web` and `packages/logger` remain pre-existing, untouched, zero-test packages (confirmed via `git log`/`git status` showing no F1 change touched either).

## 6. Security Review

- **AuthN** — every route except `(auth)/*` requires a valid Clerk session (`middleware.ts`); verified structurally — no other `@Public()`-equivalent opt-out exists in `apps/admin-web`.
- **AuthZ (defense in depth, matching the backend's own layered guard chain)** — even though the sidebar's nav-visibility table (D-116) is presentation-only, the _actual_ authorization decision for every request is made by the backend's real `@RequirePermissions` guards, unchanged; a stale frontend nav entry can at worst show a link that then 403s gracefully (`<ErrorState code="FORBIDDEN"/>`), never expose data.
- **No secrets in `apps/admin-web`** — `CLERK_SECRET_KEY` is a server-only env var read by Clerk's own SDK internals, never passed to a Client Component or logged; `apiClient` attaches only the short-lived Clerk session JWT, never a long-lived credential.
- **The one 401-handling edge case (D-118) fails toward transparency, not silence** — a session with no `TeamMember` row shows an explicit "not provisioned" message with a sign-out action, rather than silently looping or showing a generic crash.
- **No client-controlled backend-contract fields** — every request this module sends (`GET /me`, `GET /leads?q=`) uses exactly the backend's existing, unmodified contract; no new field, header, or parameter was invented.
- **Dev-only schema-drift warnings never leak into production** — gated on `process.env.NODE_ENV !== 'production'`, verified by a dedicated test.

## 7. Known Limitations (flagged, not hidden)

- No real Clerk application was exercised in this environment — build and tests use a dummy publishable/secret key pair (same external-dependency constraint as every prior module's own disclaimer, e.g. M11's Vercel API, M6/M7's Anthropic API).
- **Server Components and `middleware.ts` are not directly integration-tested via React Testing Library** — Next's App Router server-only code (the async `/me` fetch in `(dashboard)/layout.tsx`, `clerkMiddleware`'s own request handling) isn't renderable by RTL/jsdom the way a Client Component is. This module's integration tests instead exercise the pieces that _are_ renderable in isolation (`<NotProvisioned/>`, `<AppShell/>`'s child components, the `apiClient`'s exact error-shape contract) — a true end-to-end check of the full server request chain would need a running dev server and a browser automation tool (e.g. Playwright), which is out of scope for this module's automated suite and flagged here rather than silently claimed as covered.
- **The sidebar's nav-visibility table (D-116) can drift from the backend's real permission grants over time** — it's presentation-only by design (§6 of the approved architecture), and its accuracy is a UX quality concern, not a security one (§6 above); a future module could consider deriving it from `/me` if the backend ever exposes a role→capability hint, but that would be a backend contract change, out of scope for F1.
- **No client-state library (Redux/Zustand) was added** — not needed yet, since no feature module has UI-only state complex enough to warrant one; flagged so a future module doesn't assume one is already wired.
- **Mobile is functional, not polished** — per `docs/17` §8's own explicit, still-open "desktop-first" scope call, carried forward unchanged from that design doc into this implementation.

## 8. Approval Checklist

- [x] All 22 founder-named architecture items delivered (§1)
- [x] Backend verified untouched — `git status`/`git log` show zero `apps/api`/`packages/db` changes from this module (§2)
- [x] Every API call targets an existing, unmodified backend endpoint/parameter (§2)
- [x] All four architecture-stage judgment calls (nav-visibility, theme persistence, breakpoints, app naming) resolved as proposed and approved, not decided unilaterally (§3)
- [x] Real `next build` run, not just typecheck/lint/test — caught and fixed a genuine RSC bundling bug before this module was considered complete (§4, D-119)
- [x] Full test suite green (48 F1 frontend tests: 12 `packages/ui`, 36 `apps/admin-web`)
- [x] Full monorepo build/typecheck/lint clean for every touched package; `apps/web`/`packages/logger`'s pre-existing zero-test status reconfirmed as untouched by this module
- [x] Shared `config-eslint` change is additive tooling only, re-verified to change no outcome for any backend package (§2, D-121)
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-115 through D-121) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval.**
