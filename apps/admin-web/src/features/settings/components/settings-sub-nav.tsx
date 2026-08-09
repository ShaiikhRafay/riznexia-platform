'use client';

import { cn } from '@riznexia/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SUB_NAV_ITEMS = [
  { href: '/settings', label: 'Dashboard' },
  { href: '/settings/company', label: 'Company' },
  { href: '/settings/ai', label: 'AI' },
  { href: '/settings/api-keys', label: 'API Keys' },
  { href: '/settings/prompts', label: 'Prompts' },
  { href: '/settings/theme-defaults', label: 'Theme Defaults' },
  { href: '/settings/deployment', label: 'Deployment' },
  { href: '/settings/cost-budget', label: 'Cost & Budget' },
  { href: '/settings/analytics', label: 'Analytics' },
  { href: '/settings/system', label: 'System' },
  { href: '/settings/audit', label: 'Audit History' },
] as const;

// Same "one sidebar entry, many sub-pages" shape as F10's `/crm/*`, F11's
// `/deployment/*`, and F12's own `AnalyticsSubNav` — only `/settings` itself
// is a real `NAV_ITEMS` sidebar entry (`team:manage`); these ten pages are
// reached only through this in-page nav.
export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="border-(--color-border-default) flex flex-wrap gap-1 border-b pb-2"
    >
      {SUB_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/settings' ? pathname === '/settings' : pathname.startsWith(item.href);
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
