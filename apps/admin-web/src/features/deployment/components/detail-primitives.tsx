import type { ReactNode } from 'react';

// Shared read-only display primitives for F11's detail-heavy pages
// (Deployment Details, Health Monitoring) — same feature-local convention
// as F8/F9's own `detail-primitives.tsx` (DECISIONS.md D-162): not
// promoted to packages/ui, since nothing about these is generic UI, only
// this feature's own field-row conventions.
export function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-h2 text-(--color-text-primary) font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-(--color-text-secondary) shrink-0">{label}</span>
      <span className="text-(--color-text-primary) text-right">{children}</span>
    </div>
  );
}
