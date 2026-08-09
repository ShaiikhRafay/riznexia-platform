import type { ReactNode } from 'react';

export interface DetailCardProps {
  title: string;
  children: ReactNode;
}

// A plain, feature-local section wrapper for Lead Details' six required
// sections (Business/Contact/Google Places Information, Status, Notes,
// Activity Timeline) — just shared card markup, not a packages/ui
// component (nothing outside this one screen needs it yet).
export function DetailCard({ title, children }: DetailCardProps) {
  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-h2 text-(--color-text-primary) font-semibold">{title}</h2>
      {children}
    </section>
  );
}
