import type { ReactNode } from 'react';

// Shared read-only display primitives for F8's five pages (Dashboard,
// Layout/Component/Content Viewers, Generated Website Overview) — every
// one of them renders read-only field dumps of large, deeply-nested
// backend objects, so this is genuine intra-feature reuse (needed five
// times within this one feature), not a premature abstraction. Not
// promoted to packages/ui: nothing about these is generic UI, they're
// this feature's own field-row/list-row conventions.
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

export function ListField({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-(--color-text-secondary)">{label}</span>
      {items.length > 0 ? (
        <ul className="text-(--color-text-primary) list-inside list-disc">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <span className="text-(--color-text-secondary)">None</span>
      )}
    </div>
  );
}
