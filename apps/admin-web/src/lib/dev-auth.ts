// Local-development-only Clerk bypass — the frontend half of
// apps/api's DevAuthService. Active ONLY when BOTH conditions hold; a real
// deployment's NODE_ENV=production makes this false regardless of
// DEV_AUTH_ENABLED. Read once per module load (server-side only — used by
// middleware.ts and (dashboard)/layout.tsx, never shipped to the client).
export const isDevAuthEnabled =
  process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_ENABLED === 'true';
