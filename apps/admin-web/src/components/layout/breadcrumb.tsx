'use client';

import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/src/lib/auth';

// docs/17 §7 — contextual breadcrumb, never deeper than 3 levels (a 4th
// level belongs in a drawer/modal, not a route). F1 establishes only the
// top-level segment (matched against NAV_ITEMS); deeper segments (e.g.
// "Leads / Joe's Diner / Website") are added by each feature module as it
// lands, since only that module knows the human-readable label for a
// dynamic route segment like `[leadId]`.
export function Breadcrumb() {
  const pathname = usePathname();
  const activeItem = [...NAV_ITEMS]
    .reverse()
    .find((item) => (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)));

  return (
    <span className="text-(--color-text-primary) text-sm font-medium" aria-current="location">
      {activeItem?.label ?? 'Dashboard'}
    </span>
  );
}
