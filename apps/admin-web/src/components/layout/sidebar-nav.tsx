'use client';

import { cn } from '@riznexia/ui';
import {
  BarChart3,
  Contact,
  Handshake,
  LayoutDashboard,
  Rocket,
  Search,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { visibleNavItems } from '@/src/lib/auth';
import { usePermissions } from '@/src/lib/permissions-context';

const ICON_BY_NAV_ID: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  discovery: Search,
  leads: Contact,
  crm: Handshake,
  deployment: Rocket,
  analytics: BarChart3,
  team: Users,
  settings: Settings,
};

export interface SidebarNavProps {
  onNavigate?: () => void;
  className?: string;
}

// Renders the founder-approved F1-F15 module nav, filtered by permission
// (RBAC Alignment, DECISIONS.md D-122) via the ambient `PermissionsProvider`
// — never a `role` prop — reused verbatim inside both the persistent
// desktop sidebar and the mobile Sheet, so there is exactly one
// nav-rendering implementation, not two that could drift apart.
export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();
  const permissions = usePermissions();
  const items = visibleNavItems(permissions);

  return (
    <nav className={cn('flex flex-col gap-1', className)} aria-label="Primary">
      {items.map((item) => {
        const Icon = ICON_BY_NAV_ID[item.id] ?? LayoutDashboard;
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-(--color-accent) text-(--color-accent-foreground)'
                : 'text-(--color-text-secondary) hover:bg-(--color-bg-surface) hover:text-(--color-text-primary)',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
