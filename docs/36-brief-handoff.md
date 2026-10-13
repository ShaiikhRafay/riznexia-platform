# Brief hand-off: BRIEF.md + Claude Code site build

**Status:** Implemented (generator + API endpoint) — pending founder approval
**Date:** 2026-10-13

## Why this exists

The M8 pipeline (Layout -> Component -> Content -> Assembly) is deterministic by design: M7 themes are about 25 enum settings, M8.3 only binds verbatim fields (no AI-written copy), and M8.4 assembles 16 generic section components. That is safe and repeatable, but every site in a category looks the same and copy is thin. Demo sites are sales tools; they must look good enough that an owner says "I want this".

## Decision

Keep the platform for what it is good at (discovery, analysis, theme selection, CRM, outreach) and hand the _creative build_ to Claude Code through a rich Markdown brief.

```
Lead -> Business Analysis (M6) -> Theme selection (M7)
     -> GET /leads/:id/brief  => BRIEF.md   (this module)
     -> Claude Code builds ./site from BRIEF.md + CLAUDE.md (Build Pack); see docs/37-build-and-deploy-guide.md
     -> Rep reviews -> Deployment (M11, Vercel) -> Outreach/Proposal
```

This partially supersedes the "Site Builder is deterministic, not AI" stance in Doc 09 §2 for demo sites. The M8 deterministic assembler stays in the repo as a fallback / fast-preview path.

## What was added

| Piece                                                        | Location                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| Pure brief generator (`generateBrief`)                       | `packages/website-generator/src/brief/brief-generator.ts`      |
| Art direction for all 8 theme categories                     | `packages/website-generator/src/brief/design-directions.ts`    |
| Tests                                                        | `packages/website-generator/src/brief/brief-generator.test.ts` |
| API: `GET /leads/:id/brief`, `GET /leads/:id/brief/download` | `apps/api/src/brief-engine/`                                   |
| Builder rules for Claude Code                                | `apps/site-template/CLAUDE.md`                                 |
| Sample brief                                                 | `briefs/sample-restaurant/BRIEF.md`                            |

## Properties

- **Pure and deterministic.** Same (analysis, business, theme) gives the same markdown. The timestamp is injected by the API service, never read inside the generator.
- **Never fabricates.** Missing phone, hours, photos, rating or map become explicit "data gaps" in the brief; menu items/prices/testimonials beyond real data are SAMPLE content and must be labelled.
- **Brand wins over theme.** Palette and fonts are carried verbatim (M7 D-045); the design direction adds structure, motion and imagery guidance on top.
- **Read-only.** Nothing is persisted; permission `leads:read`.

## Next steps

1. Build 3 sites by hand from generated briefs (restaurant, salon, gym) and tune the design directions from what comes out.
2. Verified placeholder image library (10-15 URLs per category) replacing the single stock photo per theme.
3. "Contact & Outreach" sidebar: contact details, share link, English and Roman Urdu proposal drafts saved as `SalesProposal` versions.
4. Optional: trigger the Claude Code build headlessly from the dashboard.
