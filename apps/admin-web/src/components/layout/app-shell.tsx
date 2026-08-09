import type { TeamMember } from '@riznexia/shared-types';
import { CurrentUserProvider } from '@/src/lib/current-user-context';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { Header } from './header';
import { Sidebar } from './sidebar';

export interface AppShellProps {
  currentUser: TeamMember;
  children: React.ReactNode;
}

// frontend architecture review §5 — Sidebar + Header + main content area,
// content capped at 1440px and centered on very wide viewports
// (reconciled onto Tailwind's default breakpoint scale, §15). Wraps
// everything in `PermissionsProvider`, derived once from the session's
// `role` (already fetched via `GET /me` by the caller — no extra API
// call) — every component below reads permissions from context, never
// `currentUser.role` directly (RBAC Alignment, DECISIONS.md D-122).
// `CurrentUserProvider` (F2) makes that same already-fetched `TeamMember`
// available too, for the rare component that needs an identity field
// (e.g. its own `id`) rather than a permission check.
export function AppShell({ currentUser, children }: AppShellProps) {
  return (
    <CurrentUserProvider currentUser={currentUser}>
      <PermissionsProvider role={currentUser.role}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header currentUser={currentUser} />
            <main className="mx-auto w-full max-w-[1440px] flex-1 p-6">{children}</main>
          </div>
        </div>
      </PermissionsProvider>
    </CurrentUserProvider>
  );
}
