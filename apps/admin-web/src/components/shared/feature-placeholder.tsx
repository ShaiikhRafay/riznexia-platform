import { Construction } from 'lucide-react';

export interface FeaturePlaceholderProps {
  moduleId: string;
  title: string;
}

// Module F1 ships every top-level route so the shell is fully navigable
// from day one; each placeholder is replaced by its own module's real
// screen when that module's turn comes (F2-F14 own their own content —
// this component is intentionally the only thing F1 renders for them).
export function FeaturePlaceholder({ moduleId, title }: FeaturePlaceholderProps) {
  return (
    <div className="border-(--color-border-default) flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center">
      <Construction className="text-(--color-text-secondary) h-8 w-8" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-h1 text-(--color-text-primary) font-semibold">{title}</p>
        <p className="text-(--color-text-secondary) text-sm">
          Module {moduleId} — coming in a future frontend module.
        </p>
      </div>
    </div>
  );
}
