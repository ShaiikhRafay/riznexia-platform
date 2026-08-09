import { z } from 'zod';

// Module F1 — fails fast on a missing/malformed environment variable at
// boot rather than letting `undefined` silently reach a `fetch()` call
// (frontend architecture review §17). Only variables this app itself
// reads live here — Clerk's own SDK reads NEXT_PUBLIC_CLERK_* /
// CLERK_SECRET_KEY directly, so those aren't duplicated into this schema.
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

function loadEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
