'use client';

import { Toaster as Sonner, toast } from 'sonner';
import type { ComponentProps } from 'react';

// Module F1 — the single seam every app funnels toast notifications
// through (frontend architecture review §12: "every app consumes the
// wrapper, never `sonner` directly"). Re-exporting `toast` here means a
// future swap of the underlying library never touches a feature module's
// import.
export { toast };

export type ToasterProps = ComponentProps<typeof Sonner>;

export function Toaster({ theme = 'system', ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-(--color-bg-surface-raised) group-[.toaster]:text-(--color-text-primary) group-[.toaster]:border-(--color-border-default) group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-(--color-text-secondary)',
          actionButton:
            'group-[.toast]:bg-(--color-accent) group-[.toast]:text-(--color-accent-foreground)',
          cancelButton:
            'group-[.toast]:bg-(--color-bg-surface) group-[.toast]:text-(--color-text-secondary)',
        },
      }}
      {...props}
    />
  );
}
