'use client';

import { cn } from '@riznexia/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SUB_NAV_ITEMS = [
  { href: '/analytics', label: 'Dashboard' },
  { href: '/analytics/reports', label: 'Reports' },
  { href: '/analytics/business', label: 'Business' },
  { href: '/analytics/usage', label: 'Usage' },
  { href: '/analytics/system', label: 'System' },
  { href: '/analytics/costs', label: 'Costs' },
  { href: '/analytics/audit', label: 'Audit Logs' },
  { href: '/analytics/activity', label: 'User Activity' },
] as const;

// Reused across all eight F12 pages — only `/analytics` itself is a real
// `NAV_ITEMS` sidebar entry (RBAC Alignment, D-122); the other seven are
// reached only through this in-page nav, same "one sidebar entry, many
// sub-pages" shape as F10's `/crm/*` and F11's `/deployment/*`.
export function AnalyticsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Analytics sections"
      className="border-(--color-border-default) flex flex-wrap gap-1 border-b pb-2"
    >
      {SUB_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/analytics' ? pathname === '/analytics' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-(--color-accent) text-(--color-accent-foreground)'
                : 'text-(--color-text-secondary) hover:bg-(--color-bg-surface) hover:text-(--color-text-primary)',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
