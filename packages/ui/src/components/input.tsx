'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

// docs/17 §6 — Input states: default, focus, error, disabled. Error state
// is signaled structurally via `aria-invalid` (paired with a FormMessage
// rendering the text, never color alone — docs/17 §17).
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) placeholder:text-(--color-text-secondary) focus-visible:ring-(--color-accent) aria-[invalid=true]:border-(--color-danger) aria-[invalid=true]:focus-visible:ring-(--color-danger) flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';
