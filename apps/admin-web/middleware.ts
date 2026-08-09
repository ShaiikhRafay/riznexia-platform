import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { isDevAuthEnabled } from '@/src/lib/dev-auth';

// Module F1 — first, coarse layer of route protection (frontend
// architecture review §4): "is there a session at all." The second,
// authoritative layer is `(dashboard)/layout.tsx`, which additionally
// requires a real `TeamMember` row to exist for that session (`GET /me`)
// — a valid Clerk session with no team-member row is still redirected to
// sign-in, matching the backend's own `ClerkAuthGuard` treatment of that
// exact case as unauthenticated, not merely unauthorized.
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

// Local Development Authentication Mode (see apps/api's DevAuthService for
// the backend half): skips Clerk's middleware entirely, including its
// dev-browser handshake — which otherwise rewrites every protected route
// to a 404 when no real Clerk Frontend API exists to complete it against.
// Sign-in/sign-up are redirected straight to the dashboard rather than
// rendering Clerk's (non-functional, in this mode) hosted widget.
//
// The real `clerkMiddleware(...)` call below is completely unreached, and
// therefore unmodified in behavior, whenever `isDevAuthEnabled` is false —
// which is always true outside `NODE_ENV=development`.
function devAuthMiddleware(req: NextRequest) {
  if (isPublicRoute(req)) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export default isDevAuthEnabled
  ? devAuthMiddleware
  : clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    });

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
