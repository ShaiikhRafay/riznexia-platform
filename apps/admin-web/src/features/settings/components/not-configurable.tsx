import { Card, CardContent, CardHeader, CardTitle } from '@riznexia/ui';
import type { ReactNode } from 'react';

// Shared read-only informative primitive (D-195) — used by every F13
// page/field that names a real, non-fabricated gap: no backend model, no
// endpoint, no config surface. Never a disabled form control (same "not
// shown-then-disabled" convention `PermissionGate` follows) — a plain
// statement of what exists today and why, so the gap reads as documented,
// not hidden or broken.
export function NotConfigurable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-caption text-(--color-text-secondary) font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-(--color-text-secondary) text-sm">{children}</CardContent>
    </Card>
  );
}

export function NotConfigurableField({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-(--color-text-secondary)">{label}</span>
      <span className="bg-(--color-bg-surface-raised) text-caption text-(--color-text-secondary) rounded-full px-2 py-0.5">
        Not available
      </span>
    </div>
  );
}
