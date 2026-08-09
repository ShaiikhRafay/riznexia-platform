import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Reads DEV_AUTH_ENABLED directly from .env.local/.env rather than relying
// on process.env alone — next.config.mjs is evaluated before Next.js's own
// .env-file loading in some versions, so process.env may not be populated
// yet at this point even though it will be for the running app itself.
function readDevAuthEnabledFromEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.join(process.cwd(), file);
    if (!existsSync(fullPath)) continue;
    const match = readFileSync(fullPath, 'utf8').match(
      /^DEV_AUTH_ENABLED\s*=\s*"?(true|false)"?\s*$/m,
    );
    if (match) return match[1] === 'true';
  }
  return false;
}

const isDevAuthEnabled = process.env.NODE_ENV === 'development' && readDevAuthEnabledFromEnvFiles();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@riznexia/ui', '@riznexia/shared-types'],
  // Local Development Authentication Mode (see src/lib/dev-clerk-shim.tsx)
  // — swaps every client-side `@clerk/nextjs` import for a local shim so
  // `useAuth().getToken()` resolves instantly instead of hanging forever
  // against a placeholder Clerk key. `@clerk/nextjs/server` (used by
  // middleware.ts and (dashboard)/layout.tsx) is untouched by this alias;
  // those files gate their own dev-auth branch directly.
  ...(isDevAuthEnabled && {
    webpack(config) {
      config.resolve.alias['@clerk/nextjs$'] = path.resolve('./src/lib/dev-clerk-shim.tsx');
      return config;
    },
    turbopack: {
      resolveAlias: {
        '@clerk/nextjs': './src/lib/dev-clerk-shim.tsx',
      },
    },
  }),
};

export default nextConfig;
