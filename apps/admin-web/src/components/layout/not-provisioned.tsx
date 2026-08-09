import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@riznexia/ui';
import { UserX } from 'lucide-react';

// The one 401 case that survives past Clerk's own middleware: a valid
// Clerk session with no matching (or soft-deleted) `team_member` row —
// `ClerkAuthGuard` on the backend treats this as unauthenticated too
// (apps/api/src/common/guards/clerk-auth.guard.ts: "webhook sync hasn't
// landed yet, or the account was offboarded"). Redirecting to /sign-in
// here would loop (the Clerk session is still valid, so the sign-in page
// immediately bounces back) — this dedicated state is the correct
// resolution, not a fallback (frontend architecture review §3).
export function NotProvisioned() {
  return (
    <div className="bg-(--color-bg-canvas) flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <UserX className="text-(--color-text-secondary) h-10 w-10" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-h1 text-(--color-text-primary) font-semibold">
          Account not provisioned yet
        </p>
        <p className="text-(--color-text-secondary) max-w-sm text-sm">
          You're signed in, but no Riznexia team account is linked to this login yet. Ask an admin
          to add you, or try again in a moment if you were just invited.
        </p>
      </div>
      <SignOutButton redirectUrl="/sign-in">
        <Button variant="secondary">Sign out</Button>
      </SignOutButton>
    </div>
  );
}
