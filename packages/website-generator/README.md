# @riznexia/website-generator

Module M8 — Website Generator, built across four internal phases (M8.1 Layout Generator, M8.2 Component Generator, M8.3 Content Binding, M8.4 React/Next.js Assembly — see [docs/21-implementation-roadmap.md](../../docs/21-implementation-roadmap.md) M8 and `DECISIONS.md` D-050+). One package per module, one subdirectory per phase — mirrors `@riznexia/ai`'s internal structure rather than splitting into four near-empty packages.

Currently implements **M8.1 only**: `layout/` — a pure, deterministic `generateLayout()` that turns a `BusinessAnalysisOutput` + `ThemeConfiguration` into a `LayoutConfiguration`. No AI call, no randomness, no HTML/React/content generation.
