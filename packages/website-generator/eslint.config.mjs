import base from '@riznexia/config-eslint/base';

// templates/nextjs-base/ (Module M8.4) is a standalone downstream Next.js
// project's static source, not this monorepo's own code — same reason it
// sits outside tsconfig.json's `include`. Its files must follow Next.js's
// own conventions (App Router's page.tsx/layout.tsx/robots.ts/sitemap.ts/
// manifest.ts all require a default export; tailwind.config.ts's default
// export is how the Tailwind CLI/Next.js build reads it), which directly
// conflict with this monorepo's own "named exports only" standard (Doc 12
// §1) — so it's excluded from this package's lint run entirely rather
// than exempted rule-by-rule.
export default [...base, { ignores: ['templates/**'] }];
