import type { TeamMember } from '@riznexia/shared-types';
import { Breadcrumb } from './breadcrumb';
import { GlobalSearch } from './global-search';
import { MobileSidebar } from './mobile-sidebar';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export interface HeaderProps {
  currentUser: TeamMember;
}

// docs/17 §7 — sticky top bar: breadcrumb, global search, user menu (which
// itself holds the theme toggle's sibling, profile link, sign-out).
export function Header({ currentUser }: HeaderProps) {
  return (
    <header className="border-(--color-border-default) bg-(--color-bg-canvas) sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-4">
      <MobileSidebar />
      <Breadcrumb />
      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />
        <ThemeToggle />
        <UserMenu currentUser={currentUser} />
      </div>
    </header>
  );
}
