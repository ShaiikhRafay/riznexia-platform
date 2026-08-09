'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';
import { cn } from '../lib/utils';

// F9 (Website Preview) — first real need for a tabbed view (device-mode
// switching, validation-category sections); promoted straight to
// packages/ui rather than built feature-local, matching the founder's own
// explicit "reuse existing components: ... Tabs" instruction and the same
// "first real need, add it here" precedent as F4's AlertDialog/Textarea.
export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'bg-(--color-bg-surface-raised) inline-flex items-center gap-1 rounded-lg p-1',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'text-(--color-text-secondary) rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
      'data-[state=active]:bg-(--color-bg-surface) data-[state=active]:text-(--color-text-primary) data-[state=active]:shadow-sm',
      'focus-visible:ring-(--color-border-focus) focus-visible:outline-none focus-visible:ring-2',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
