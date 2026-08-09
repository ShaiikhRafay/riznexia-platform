'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils';

// `indeterminate` (the "some but not all rows on this page selected"
// state DataTable's header checkbox needs) isn't a Radix Checkbox prop —
// Radix models it as `checked="indeterminate"`, a third value alongside
// boolean, per its own API.
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'border-(--color-border-default) bg-(--color-bg-canvas) focus-visible:ring-(--color-accent) data-[state=checked]:border-(--color-accent) data-[state=checked]:bg-(--color-accent) data-[state=indeterminate]:border-(--color-accent) data-[state=indeterminate]:bg-(--color-accent) flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="text-(--color-accent-foreground) flex items-center justify-center">
      {props.checked === 'indeterminate' ? (
        <Minus className="h-3 w-3" />
      ) : (
        <Check className="h-3 w-3" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
