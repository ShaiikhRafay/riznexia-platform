# Module Review Report — M8.1: Layout Generator (Phase 1 of 4, Module M8 — Website Generator)

**Status:** Phase M8.1 implementation complete, pending founder approval. Phases M8.2 (Component Generator), M8.3 (Content Binding), M8.4 (React/Next.js Assembly) not started.
**Date:** 2026-07-31
**Reviewed against:** the founder's M8.1 phase brief (objective, inputs/outputs, determinism requirement, validation list, explicit scope exclusions), given directly ahead of an architecture review that resolved three open forks before implementation. `docs/21-implementation-roadmap.md`'s M8 entry is **untouched** — this is a phase boundary within one module, not a roadmap change (D-022's frozen-roadmap discipline still applies).

---

## 1. Scope Compliance

| Requirement                                                                      | Delivered | Where                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generates layout structure only                                                  | ✅        | `LayoutConfiguration` — page structure, section order, navigation/hero/content layout, grid definitions, responsive rules, sidebar, footer structure, CTA placement, component placeholders  |
| Must NOT generate React code                                                     | ✅        | No JSX/TSX/component code anywhere in `packages/website-generator` or the persisted output                                                                                                   |
| Must NOT generate HTML                                                           | ✅        | Output is pure structured data (Json columns), no markup                                                                                                                                     |
| Must NOT generate website content                                                | ✅        | `navigation.items`/`componentPlaceholders` carry theme-authored ids, never display copy; no field holds generated text                                                                       |
| Must NOT generate images                                                         | ✅        | No image field anywhere in `LayoutConfiguration`                                                                                                                                             |
| Input: `BusinessAnalysis` (M6)                                                   | ✅        | `LayoutGenerationService.generateLayoutForLead()` reads the source analysis via `ThemeConfiguration.businessAnalysisId`                                                                      |
| Input: `ThemeConfiguration` (M7)                                                 | ✅        | Reads the lead's latest `ThemeConfiguration` row                                                                                                                                             |
| Output: `LayoutConfiguration`                                                    | ✅        | Full field table in §5                                                                                                                                                                       |
| Deterministic — same inputs always produce the same output, no randomness        | ✅        | `generateLayout()` is a pure function (fixed lookup tables + arithmetic only); verified by a unit test asserting 3 consecutive calls with identical input produce `toEqual`-identical output |
| Validate: required sections exist                                                | ✅        | `validateLayoutConfiguration()` — `pageStructure` must exactly mirror `ThemeConfiguration.sectionOrder`                                                                                      |
| Validate: responsive rules exist                                                 | ✅        | Every section must have a `responsiveRules.perSection` entry                                                                                                                                 |
| Validate: accessibility constraints                                              | ✅        | `tapTargetSizePx`/`stackedLayout` carried through and checked non-null; source `accessibilityProfile` checked present                                                                        |
| Validate: navigation integrity                                                   | ✅        | Every `navigation.items` entry must resolve to a real section                                                                                                                                |
| Validate: section ordering                                                       | ✅        | `pageStructure` entries must be ordered 1..N with no gaps                                                                                                                                    |
| Unit tests                                                                       | ✅        | 28 new `packages/website-generator` + 12 new `apps/api` + 1 new `packages/themes` + 13 new `packages/shared-types`                                                                           |
| Integration tests                                                                | ✅        | 12 new (`layout.e2e-spec.ts`)                                                                                                                                                                |
| Structured logging                                                               | ✅        | `Logger` on `LayoutGenerationService`, matching every prior module's convention                                                                                                              |
| Documentation                                                                    | ✅        | TASKS.md, CHANGELOG.md, DECISIONS.md (D-049 through D-054), this report                                                                                                                      |
| Do not start component generation / content binding / React / Next.js generation | ✅        | Verified by scope — touches only `packages/db`, `packages/shared-types`, `packages/themes` (D-049 extension), `packages/website-generator` (new), `apps/api`                                 |

**Roadmap frozen, not touched:** `docs/21-implementation-roadmap.md`'s M8 entry was not edited — M8 as a whole remains "Not started" there since only its first internal phase is complete.

## 2. Pre-Implementation Architecture Review

The founder's phase brief specified the objective, inputs/outputs, the determinism requirement, and the validation list directly. Before any code was written, an architecture was presented covering: package placement, the full `LayoutConfiguration` TypeScript shape, and the deterministic derivation rules per output area — with three open forks flagged explicitly:

1. **Component↔section mapping** — M7's `ThemeDefinitionContent.componentSet`/`.sectionOrder` were two independent flat lists with no link between them, discovered while designing `componentPlaceholders`. Three options were presented (extend M7's data model explicitly; guess via name-matching heuristics; keep components/sections decoupled). Founder chose to extend M7's data model — DECISIONS.md D-049.
2. **Validation-failure semantics** — whether a `validateLayoutConfiguration()` failure should be a new domain exception (M7's `THEME_NOT_FOUND` pattern) or an internal-bug signal. Founder chose the latter — DECISIONS.md D-052.
3. **API exposure this phase** — whether to ship `GET/POST /leads/:id/layout` now or wait for a later M8 phase. Founder chose to ship it now, consistent with M6/M7's own precedent — DECISIONS.md D-053.

Full reasoning: `DECISIONS.md` D-049 through D-054.

## 3. Implementation Summary

**`packages/themes` extension (D-049):** `sectionComponentMap: Record<string, string[]>` added to `ThemeDefinitionContent`; populated by hand for all 8 existing theme definitions. New invariant test (`static-theme-registry.test.ts`) asserts every `componentSet` entry is mapped exactly once, keyed only by real `sectionOrder` entries.

**Schema (`packages/db/prisma/schema.prisma`):** `ThemeConfiguration.sectionComponentMap` (amended into the still-unshipped M7 migration, D-049). New `LayoutConfiguration` model — versioned per business, dual FK (`businessAnalysisId`, `themeConfigurationId`), every compound structure a `Json` column. New, purely additive migration `20260731000000_m8_1_layout_generator`.

**Contracts (`packages/shared-types`):** `theme-configuration.ts` extended with `sectionComponentMap`. New `layout-configuration.ts` — `layoutConfigurationSchema` + 8 nested schemas (`pageSectionLayoutSchema`, `navigationLayoutSchema`, `heroLayoutSchema`, `footerLayoutSchema`, `sidebarLayoutSchema`, `gridDefinitionSchema`, `responsiveRuleSetSchema`, `ctaPlacementSchema`, `componentPlaceholderSchema`).

**New `packages/website-generator`** (D-050 — Module M8's package, mirrors `packages/ai`'s internal-subdirectory structure): `layout/layout-generator.ts` (`generateLayout()`, `LAYOUT_ENGINE_VERSION`), `layout/layout-validator.ts` (`validateLayoutConfiguration()`), `layout/layout-fixtures.ts` (shared test fixtures). Real `tsc`/CommonJS build, Prisma/NestJS-free.

**Services (`apps/api/src/layout-engine/`):** `LayoutEngineModule` (DI wiring, no `ThemeModule`/`AiModule` dependency — `generateLayout()` is a pure function, not a registered provider), `LayoutGenerationService` (cache check by `themeConfigurationId`, generate + validate + versioned persistence), `LayoutGenerationController` (`GET/POST /leads/:id/layout`), `dto/layout-configuration-response.dto.ts`.

**Exceptions/permissions:** new `ThemeConfigurationNotFoundException` (`THEME_CONFIGURATION_NOT_FOUND`, 404); new `layout:generate` permission, same role set as `theme:select`/`business:analyze`.

**Logging:** `Logger` on `LayoutGenerationService` — cache hit/miss, completion.

## 4. Test Coverage

| Suite                                                         | Tests | Notes                                                                                                                                                                                           |
| ------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/themes` (`static-theme-registry.test.ts`, extended) | +1    | `sectionComponentMap` covers `componentSet` exactly once, keyed only by real sections, for all 8 themes                                                                                         |
| `packages/shared-types` (`layout-configuration.test.ts`)      | 13    | Full schema, nested-schema validation, nullable-vs-missing sidebar                                                                                                                              |
| `packages/website-generator` (`layout-generator.test.ts`)     | 18    | Determinism (3x identical output), every derivation rule (nav/hero/footer/sidebar/grid/responsive/CTA/placeholders) exercised across theme style variations                                     |
| `packages/website-generator` (`layout-validator.test.ts`)     | 10    | Passes on real `generateLayout()` output (incl. sidebar-navigation); fails on each corrupted invariant (order, nav integrity, sidebar mismatch, missing responsive rules, unknown section refs) |
| `apps/api` (`layout-generation.service.spec.ts`)              | 8     | Cache hit/miss, `LeadNotFoundException`, `ThemeConfigurationNotFoundException`, `configVersion` allocation, real (unmocked) `generateLayout()` output persisted                                 |
| `apps/api` (`layout-generation.controller.spec.ts`)           | 4     | 200 vs. 201 status selection, delegation                                                                                                                                                        |
| `apps/api/test/layout.e2e-spec.ts`                            | 12    | Auth, RBAC, cache hit/miss, `THEME_CONFIGURATION_NOT_FOUND`, full flow against the real (unmocked) generator/validator, non-UUID validation                                                     |

**Totals:** `apps/api` unit 347/347 (up from 335), e2e 118/118 (up from 106). `packages/themes` 18/18 (up from 17). `packages/website-generator` 28/28 (new package). `packages/shared-types` 102/102 (up from 89). Full monorepo build/typecheck/lint clean for every touched package; `pnpm turbo run build typecheck lint test` green (excluding three pre-existing, unrelated packages with no test files: `logger`, `ui`, `web` — none touched by this phase).

## 5. `LayoutConfiguration` Field Reference

| Field                                                    | Source                                                                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `businessId`/`businessAnalysisId`/`themeConfigurationId` | Provenance — both upstream dependencies                                                                                                              |
| `configVersion`/`layoutEngineVersion`                    | Versioning, same pattern as `BusinessAnalysis`/`ThemeConfiguration`                                                                                  |
| `pageStructure`                                          | One entry per `ThemeConfiguration.sectionOrder` entry, order preserved; `layoutType` derived from hero position + D-049's `sectionComponentMap`      |
| `navigation`                                             | `style`/pass-through from `ThemeConfiguration.navigationStyle`; `items` = every section between hero and footer                                      |
| `hero`                                                   | `style` pass-through; `mediaPosition`/`contentAlignment` from a fixed `heroStyle` lookup; `ctaSlots` from `ctaRecommendations.length`, capped at 2   |
| `footer`                                                 | `style` pass-through; `columns` from a fixed `footerStyle` lookup; `includesSocialLinks` from `socialProofSuggestions` presence                      |
| `sidebar`                                                | Populated only when `navigationStyle === 'sidebar'`; `null` otherwise                                                                                |
| `grid`                                                   | One entry per section with ≥1 mapped component (excl. hero); `gap` from a fixed `animationLevel` lookup                                              |
| `responsiveRules`                                        | Fixed breakpoint constants; `stackedLayout`/`tapTargetSizePx` pass-through from `mobilePreferences`; `perSection` derived from grid + stacked-layout |
| `ctaPlacements`                                          | Up to 3 entries from `ctaRecommendations`, zoned by position + `ctaStyle`; `style` pass-through                                                      |
| `componentPlaceholders`                                  | `sectionComponentMap` flattened in `sectionOrder` order                                                                                              |

## 6. Security Review

- **AuthZ** — `POST /leads/:id/layout` requires the new `layout:generate` permission (same role set as `theme:select`/`business:analyze`); `GET` requires only `leads:read`. Verified: a Viewer gets 403 on POST, 200 on GET.
- **Cost governance** — not applicable. `generateLayout()` calls no external service (no AI, no third-party API) — there is nothing to meter against the monthly cost ceiling, unlike M6/M7's AI steps.
- **No secrets/PII newly logged** — log lines carry businessId/themeConfigurationId/section count only.

## 7. Known Limitations (flagged, not hidden)

- The migration has not been run against a real Postgres instance — same constraint as every prior module.
- `sectionComponentMap`'s grid/sidebar-adjacent derivation rules (grid applies to any section with ≥1 mapped component; sidebar defaults to fixed `{position:'left', width:'standard', sticky:true}`) are deterministic but untested against real user-facing layout quality — no registered theme currently uses `navigationStyle: 'sidebar'`, so that path is only unit-tested against a synthetic fixture, not exercised by any of the 8 real theme definitions.
- `responsiveRules.perSection` only ever produces `'stack'`/`'reflow'` in this version's algorithm (the schema's `SectionResponsiveRule` type is exactly those two values — no unused third state was speculatively added).
- Grid `columns`/`gap` are theme-wide-derived defaults (fixed `{mobile:1,tablet:2,desktop:3}`, `gap` from `animationLevel`), not per-section-tuned — a reasonable v1 starting point per the determinism requirement, not a claim of production-grade responsive design tuning.

## 8. Approval Checklist

- [x] Phase brief requirements delivered: layout structure only, no React/HTML/content/images generated
- [x] Architecture reviewed before implementation; three open forks resolved (component↔section mapping, validation-failure semantics, API exposure) before code was written
- [x] Roadmap not renamed/reordered/merged/split — `docs/21-implementation-roadmap.md`'s M8 entry untouched
- [x] Deterministic — verified by a repeated-call-identical-output unit test
- [x] All five validation checks implemented and unit-tested (positive + negative cases)
- [x] Full test suite green (347 unit + 118 e2e in `apps/api`; 18 in `packages/themes`; 28 in `packages/website-generator`; 102 in `packages/shared-types`)
- [x] Full monorepo build/typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md (D-049 through D-054) updated
- [x] Self-review complete, this report generated

**Awaiting founder approval before Phase M8.2 (Component Generator).**
