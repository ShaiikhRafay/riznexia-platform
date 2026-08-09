import type { ReactNode } from 'react';

// Reused across the Dashboard and every themed page (Business/Usage/
// System/Cost Analytics) — each of those pages makes exactly one
// `useAnalyticsDashboard()` call for the whole page, so loading/error is
// handled once at the page level (matching the rest of this app's
// established isLoading/error/data pattern), rather than per-card like
// F2's independently-fetching widget registry.
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h2 text-(--color-text-primary) font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-2 rounded-lg border p-4">
      <p className="text-caption text-(--color-text-secondary) font-medium">{title}</p>
      {children}
    </div>
  );
}

export function Stat({ children }: { children: ReactNode }) {
  return <p className="text-display text-(--color-text-primary) font-semibold">{children}</p>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="text-caption text-(--color-text-secondary)">{children}</p>;
}
