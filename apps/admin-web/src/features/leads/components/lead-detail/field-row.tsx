import type { ReactNode } from 'react';

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-(--color-text-secondary)">{label}</span>
      <span className="text-(--color-text-primary)">{children}</span>
    </div>
  );
}
