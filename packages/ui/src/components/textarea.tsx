'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

// Same states/pattern as `Input` (docs/17 §6) for multi-line text —
// F4's first consumer (lead notes), generic beyond that.
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) placeholder:text-(--color-text-secondary) focus-visible:ring-(--color-accent) aria-[invalid=true]:border-(--color-danger) aria-[invalid=true]:focus-visible:ring-(--color-danger) flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
