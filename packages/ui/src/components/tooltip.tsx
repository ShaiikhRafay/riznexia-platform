'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';
import { cn } from '../lib/utils';

// docs/17 §5 — icons never appear alone as the only signifier of an action;
// this Tooltip is the pairing mechanism for icon-only affordances (e.g. the
// collapsed sidebar rail).
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'border-(--color-border-default) bg-(--color-bg-surface-raised) text-(--color-text-primary) z-50 overflow-hidden rounded-md border px-3 py-1.5 text-xs shadow-md',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
