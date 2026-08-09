import type { ReactNode } from 'react';

// Shared read-only label/value row helpers for F9's five pages — same
// intra-feature reuse convention as F8's `detail-primitives.tsx`. Unlike
// F8, section containers here use the newly-promoted shared `Card` (from
// `@riznexia/ui`, this module's own first real need for it per the
// founder's "reuse existing components: ... Cards" instruction) instead of
// a feature-local `DetailCard` — `FieldRow`/`ListField` remain feature-local
// since they're this feature's own label/value formatting convention, not
// generic UI.
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
