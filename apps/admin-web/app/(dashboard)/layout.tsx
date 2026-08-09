import { auth } from '@clerk/nextjs/server';
import { teamMemberSchema, type TeamMember } from '@riznexia/shared-types';
import { AppShell } from '@/src/components/layout/app-shell';
import { NotProvisioned } from '@/src/components/layout/not-provisioned';
import { apiClient, ApiError } from '@/src/lib/api-client';
import { isDevAuthEnabled } from '@/src/lib/dev-auth';

// Second, authoritative layer of route protection (frontend architecture
// review §4): middleware already guarantees a Clerk session exists;
// this layer additionally requires a real `TeamMember` row for it via the
// same `GET /me` the backend exposes for exactly this purpose.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Local Development Authentication Mode: Clerk's own `auth()` requires
  // `clerkMiddleware()` to have run for this request, which
  // `middleware.ts`'s dev-auth branch deliberately skips — so this must
  // skip calling it too, rather than let it throw. The backend's own
  // DevAuthService ignores whatever token (or lack of one) `GET /me`
  // carries in this mode, so `null` here is enough to reach it.
  let token: string | null = null;
  if (!isDevAuthEnabled) {
    const { getToken } = await auth();
    token = await getToken();
  }

  let currentUser: TeamMember;
  try {
    currentUser = await apiClient.get<TeamMember>('/me', { token, schema: teamMemberSchema });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return <NotProvisioned />;
    }
    // An unexpected failure (5xx, network) — let the nearest error
    // boundary (app/error.tsx) render the shared crash fallback rather
    // than swallowing it into a misleading "not provisioned" state.
    throw error;
  }

  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
