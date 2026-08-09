'use client';

import { Input } from '@riznexia/ui';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// docs/17 §7 — global lead search. F1 owns only the navigation affordance
// (submitting routes to `/leads?q=...`, the backend's real query param —
// `listLeadsQuerySchema`'s `q`, not `search`); rendering the actual result
// list against that query belongs to F4 (Lead Management), not this
// foundation module, per "never implement business rules/screens ahead of
// their own module."
export function GlobalSearch() {
  const router = useRouter();
  const [term, setTerm] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      return;
    }
    router.push(`/leads?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative hidden sm:block">
      <Search
        className="text-(--color-text-secondary) pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search leads…"
        aria-label="Search leads"
        className="w-56 pl-8"
      />
    </form>
  );
}
