import { Logo } from './logo';
import { SidebarNav } from './sidebar-nav';

// Persistent left sidebar, `lg`+ only (frontend architecture review §14) —
// below `lg` the same `SidebarNav` renders inside the Header's mobile
// Sheet instead (`mobile-sidebar.tsx`), so there is one nav implementation
// reused in two shells, never a second copy. Takes no `role` prop — nav
// filtering reads permissions from the ambient `PermissionsProvider`
// (DECISIONS.md D-122).
export function Sidebar() {
  return (
    <aside className="border-(--color-border-default) bg-(--color-bg-surface) hidden w-60 shrink-0 flex-col border-r lg:flex">
      <div className="border-(--color-border-default) flex h-14 items-center border-b px-4">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>
    </aside>
  );
}
