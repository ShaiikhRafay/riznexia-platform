'use client';

// Local Development Authentication Mode — module-aliased in place of the
// real '@clerk/nextjs' client entry (see next.config.mjs) ONLY when
// DEV_AUTH_ENABLED=true. Exists because the real ClerkProvider, given only
// a placeholder publishableKey (no real Clerk application exists locally),
// never finishes loading its remote script (`window.Clerk` never becomes
// ready) — every one of this app's ~48 `useAuth().getToken()` call sites
// then hangs forever waiting on it, silently breaking every data fetch.
// Swapping the whole client entry keeps every one of those call sites
// completely unchanged (they still just do `const { getToken } =
// useAuth()`), satisfying "no frontend code changes" — only the module
// they resolve to changes, for this build, in this mode.
//
// Every export here matches the shape this codebase actually destructures
// from the real package (verified by grep — only `getToken` is ever read
// off `useAuth()`'s return value); nothing beyond that shape is provided,
// since this shim is dev-only local tooling, not a general Clerk mock.
import type { ReactNode } from 'react';

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return { getToken: async () => null };
}

export function useClerk() {
  return {
    signOut: async (options?: { redirectUrl?: string }) => {
      window.location.href = options?.redirectUrl ?? '/';
    },
  };
}

export function SignOutButton({ children }: { children: ReactNode; redirectUrl?: string }) {
  return <>{children}</>;
}

// Unreached at runtime — middleware.ts's dev-auth branch redirects
// /sign-in and /sign-up straight to "/" before either page ever renders.
// Present only so the module resolves for the bundler.
export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}
