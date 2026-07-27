# Git Strategy — Riznexia AI Sales Platform

**Status:** Draft (revised — internal-tool scope)
**Last updated:** 2026-07-27

> **Scope change note:** No functional change to the git workflow itself — this document was already infrastructure-focused rather than product-scope-focused. Only §6 wording tightened to reflect that demo repos are always Riznexia-owned with no ambiguity.

## 1. Branching Model

**Trunk-based development** with short-lived feature branches. Chosen for a small (2–5) team with continuous release cadence.

- `main` — always deployable; auto-deploys to **staging**.
- `production` — protected; promoted from `main` via a release PR/tag; auto-deploys to **production**.
- Feature branches: `feature/<ticket-or-short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`. Branched from `main`, merged back via PR, deleted after merge.
- No long-lived `develop` branch — `main` fills that role.

## 2. Commit Convention

**Conventional Commits**, enforced via commit-lint in CI:
```
feat(leads): add pipeline stage filter to lead list
fix(generation): retry stage on transient AI timeout
chore(deps): bump next to latest stable
docs: update API spec for deployment webhook
```
Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`.

## 3. Pull Request Process

- Every change lands via PR — no direct pushes to `main` or `production`.
- PR must pass CI (lint, typecheck, test, build) before merge is allowed.
- At least one review approval required once the team is >1 engineer; solo period may self-merge after CI passes as a documented temporary exception.
- PR description links the relevant PRD requirement ID(s) (e.g., "Implements FR-4.6").
- Squash-merge to `main`.

## 4. Release Strategy

- `main` → staging is continuous/automatic on every merge.
- `main` → `production` is a deliberate promotion via release PR/tag.
- Semantic versioning for the platform's own release tags (not meaningful for generated demo site repos, which have independent single-branch histories).

## 5. Protected Branches

- `main`: requires passing CI, no force-push.
- `production`: requires passing CI + release PR approval, no direct commits.

## 6. Handling Generated Demo Site Repos

Generated demo site repositories (one per lead, per Technical Architecture §6) are **not** part of this monorepo's git history or branching model — they are created/pushed to by the deployment pipeline as build artifacts under Riznexia's own GitHub org, each with a minimal single-branch (`main`) history sufficient for Vercel's Git integration to redeploy on push.

---
**Proceeding to Document 12 (Coding Standards).**
