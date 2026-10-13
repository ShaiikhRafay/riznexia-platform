import { BUILDER_RULES_MD } from './builder-rules';
import { createZip } from './zip.util';

export const PACKAGE_SCRIPT = `#!/usr/bin/env bash
# Packages ./site into site.zip (source only) for upload to the Riznexia portal.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f site/package.json ]; then echo "ERROR: site/package.json not found. Build the site first."; exit 1; fi
rm -f site.zip
zip -rq site.zip site \\
  -x "site/node_modules/*" "site/.next/*" "site/.git/*" "site/.vercel/*" "site/out/*" \\
     "site/.env*" "*/.DS_Store" "site/package-lock.json" "site/pnpm-lock.yaml" "site/yarn.lock"
echo "Created site.zip ($(du -h site.zip | cut -f1)). Upload it in the portal: Outreach -> Upload site."
`;

export function startMarkdown(businessName: string): string {
  return `# ${businessName} — build pack

1. Open a terminal in this folder.
2. Run \`claude\` and paste:

   Read CLAUDE.md and BRIEF.md completely, then build the full website in ./site exactly as specified. Follow the acceptance checklist and run the verification steps before you finish.

3. When Claude says it is done, run: \`bash package-site.sh\`
4. In the portal open this lead -> Outreach -> Upload site -> choose \`site.zip\` -> Deploy.
`;
}

export function buildPackZip(brief: { markdown: string }, businessName: string): Buffer {
  const b = (s: string) => Buffer.from(s, 'utf8');
  return createZip([
    { path: 'BRIEF.md', data: b(brief.markdown) },
    { path: 'CLAUDE.md', data: b(BUILDER_RULES_MD) },
    { path: 'package-site.sh', data: b(PACKAGE_SCRIPT) },
    { path: 'START.md', data: b(startMarkdown(businessName)) },
  ]);
}
