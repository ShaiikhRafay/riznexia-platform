import * as React from 'react';
import { cn } from '../lib/utils';

// docs/17 §18 — loading states use skeletons, not spinners, for anything
// with a predictable shape (tables, cards). `prefers-reduced-motion`
// collapses the pulse to a static state via the `motion-reduce:` variant.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-(--color-bg-surface-raised) animate-pulse rounded-md motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
