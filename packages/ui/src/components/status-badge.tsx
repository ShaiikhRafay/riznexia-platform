import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/utils';

// docs/17 §6 — Status Badge: "same 5-state vocabulary reused everywhere a
// job/pipeline status appears." Deliberately generic — this component has
// no idea what "queued" or "completed" means; a consuming feature maps
// its own domain status (DiscoveryJobStatus, DeploymentStatus, TaskStatus,
// ...) onto one of these five tones plus a display label. Never
// color-only (docs/17 §17) — every badge pairs its color with visible
// text, never relying on hue alone.
export const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-(--color-bg-surface-raised) text-(--color-text-secondary)',
        info: 'bg-(--color-info)/15 text-(--color-info)',
        success: 'bg-(--color-success)/15 text-(--color-success)',
        warning: 'bg-(--color-warning)/15 text-(--color-warning)',
        danger: 'bg-(--color-danger)/15 text-(--color-danger)',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {
  label: string;
}

export function StatusBadge({ variant, label, className, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
