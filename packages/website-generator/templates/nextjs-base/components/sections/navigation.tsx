'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SourcedLinkList } from '@/lib/types';

export interface NavigationProps {
  businessName: string;
  links: SourcedLinkList;
  sticky: boolean;
  mobileBehavior: 'hamburger' | 'bottom-tab' | 'top-tab';
}

// Semantic <nav>, keyboard-operable disclosure on mobile (WCAG AA /
// keyboard navigation requirement) — the hamburger button is a real
// <button> with aria-expanded/aria-controls, not a div with a click
// handler.
export function Navigation({ businessName, links, sticky, mobileBehavior }: NavigationProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <header
      className={
        sticky
          ? 'border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur'
          : 'border-border bg-background border-b'
      }
    >
      <nav
        aria-label="Primary"
        className="px-token-md py-token-sm mx-auto flex max-w-6xl items-center justify-between"
      >
        <Link href="#main-content" className="font-heading text-foreground text-lg font-semibold">
          {businessName}
        </Link>

        <ul className="gap-token-md hidden items-center md:flex">
          {links.value.map((link) => (
            <li key={link.targetComponentId}>
              <a
                href={`#${link.targetComponentId}`}
                className="text-foreground hover:text-primary text-sm font-medium"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {mobileBehavior === 'hamburger' && (
          <Button
            type="button"
            variant="outline"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        )}
      </nav>

      {mobileBehavior === 'hamburger' && open && (
        <ul
          id="mobile-nav-menu"
          className="gap-token-sm border-border px-token-md py-token-sm flex flex-col border-t md:hidden"
        >
          {links.value.map((link) => (
            <li key={link.targetComponentId}>
              <a
                href={`#${link.targetComponentId}`}
                className="py-token-xs text-foreground block min-h-[var(--min-touch-target)] text-sm font-medium"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
