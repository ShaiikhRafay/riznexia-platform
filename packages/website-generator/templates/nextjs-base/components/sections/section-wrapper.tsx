import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SectionWrapperProps {
  id: string;
  ariaLabel: string;
  layoutType: 'full-width' | 'grid' | 'contained';
  // Optional, not required: lib/site-data.ts's generated per-section props
  // const never includes `children` — the assembler injects real child
  // components via JSX nesting in app/page.tsx instead, and a section can
  // legitimately have zero children (e.g. a theme section with no mapped
  // components).
  children?: React.ReactNode;
}

// The structural <section> every M8.1 "section" ComponentDefinition maps
// onto — semantic HTML landmark with an accessible name (WCAG AA), never
// content of its own (M8.2's `section` type has no content slots).
export function SectionWrapper({ id, ariaLabel, layoutType, children }: SectionWrapperProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn('py-token-xl', layoutType === 'full-width' ? '' : 'px-token-md')}
    >
      <div className={cn(layoutType === 'full-width' ? '' : 'mx-auto max-w-6xl')}>{children}</div>
    </section>
  );
}
