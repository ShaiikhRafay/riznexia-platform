# 37 — Build & deploy guide (Claude Code builders → portal → Vercel)

## The flow

```
Portal: Discovery → Analysis → Theme Engine
   │
   ▼  Outreach & Proposals → Download Build Pack (BRIEF.md + CLAUDE.md + package-site.sh + START.md)
Builder (2 people, 1 Claude Code subscription), terminal:
   unzip → claude → build ./site → bash package-site.sh → site.zip
   │
   ▼  Portal: Upload site.zip → validated → Deploy (Vercel REST, same provider as before)
Portal: live link → Share (WhatsApp / email) → EN / Roman Urdu proposal → Save to CRM → Mark sent
```

## One-time server setup (API host)

1. Apply the DB change (new tables `custom_sites`, `custom_site_deployments`):
   `pnpm --filter @riznexia/db migrate:dev --name custom_sites` (dev) / `migrate:deploy` (prod), then `pnpm --filter @riznexia/db generate`.
2. Env on the API: `VERCEL_API_TOKEN` (required), `VERCEL_TEAM_ID` (if you use a team).
3. Vercel → Project/Team settings → **Deployment Protection must be off (or "Only preview" protected)** for production, otherwise the live link asks the owner to log in to Vercel.
4. Request body limit: uploads are read raw (max 8 MB); no proxy in front should cap lower than that.

## Builder machine (once)

```bash
npm i -g @anthropic-ai/claude-code      # then run `claude` once and log in
node -v                                  # Node 20+ needed for the site
brew install zip                         # macOS already has zip; on Windows use WSL/Git Bash
```

## Per website (the 6 commands)

```bash
# 1. In the portal: Outreach & Proposals → pick lead → Download Build Pack
cd ~/Downloads && unzip build-pack-<business>.zip -d <business> && cd <business>

# 2. Start Claude Code in that folder
claude

# 3. Paste this prompt inside Claude Code
Read CLAUDE.md and BRIEF.md completely, then build the full website in ./site exactly as specified. Follow the acceptance checklist and run the verification steps before you finish.

# 4. When it says done, exit Claude (/exit) and package
bash package-site.sh        # creates site.zip (no node_modules/.next/.env)

# 5. In the portal: Upload site.zip → Deploy → wait for "Live" (1–3 min)
# 6. Share link / Generate proposal (Roman Urdu or English) → Save to CRM → Mark as sent
```

Optional local check before packaging: `cd site && npm install && npm run dev` (open http://localhost:3000).

## Upload rules (the validator rejects otherwise)

- `site.zip` contains the Next.js project (`package.json` with `next` + `build` script, `app/page.tsx`).
- Text files only. No PNG/JPG/fonts/video: use remote image URLs (Unsplash/Pexels) or SVG. (Vercel deploy API here carries text files.)
- No `.env*` files, no API keys (scanned).
- Max 400 files, 6 MB of source.

## Redeploy / fix

Fix with Claude Code in the same folder → `bash package-site.sh` → upload again (creates version N+1) → Deploy. Same Vercel project name per business, so the URL stays stable.

## Notes

- Permissions reused: Build Pack/Outreach `leads:read`; upload `website:assemble`; deploy `deployment:create`; status `deployment:view`; draft/save proposal `crm:manage`.
- Proposal drafts are deterministic templates (no AI cost, no invented facts). Reps edit, then Save to CRM (immutable version) and Mark as sent.
- `apps/api/src/custom-site/builder-rules.ts` is a copy of `apps/site-template/CLAUDE.md`; update both together.
- Anthropic's terms for sharing one subscription between two people: confirm with Anthropic/your plan before relying on it.
