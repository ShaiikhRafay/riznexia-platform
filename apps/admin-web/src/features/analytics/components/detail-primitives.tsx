import type { ReactNode } from 'react';

// Feature-local read-only display primitives, same convention as every
// prior module's own `detail-primitives.tsx` (DECISIONS.md D-162) — needed
// across all fifteen report renderers in this feature.
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
