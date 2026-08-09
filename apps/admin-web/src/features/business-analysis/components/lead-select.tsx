'use client';

import { Input } from '@riznexia/ui';
import { useEffect, useState } from 'react';
import { useLeads } from '@/src/features/leads/api/use-leads';

export interface LeadSelectProps {
  value: string | null;
  onChange: (leadId: string, businessName: string) => void;
}

// Select Lead (F6 Dashboard feature): reuses F4's `useLeads()` directly
// (`GET /leads?q=...`) rather than building a second leads-fetching hook
// inside this feature — the same "never duplicate what another module
// already built" discipline as F6 reusing F4's leads list instead of
// re-implementing it. `q` requires 2+ chars, matching
// `listLeadsQuerySchema` exactly (same rule GlobalSearch/Lead List already
// enforce).
export function LeadSelect({ value, onChange }: LeadSelectProps) {
  const [draft, setDraft] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(draft), 300);
    return () => clearTimeout(timeout);
  }, [draft]);

  const trimmed = debounced.trim();
  const q = trimmed.length >= 2 ? trimmed : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search leads by business name…"
        aria-label="Search leads"
      />
      {q ? (
        <LeadSearchResults
          q={q}
          value={value}
          onChange={onChange}
          onSelect={() => {
            setDraft('');
            setDebounced('');
          }}
        />
      ) : null}
    </div>
  );
}

// Split out so `useLeads()` (and its real `GET /leads?q=` fetch) is only
// ever called once the search term is actually valid — not fired on
// every keystroke and discarded client-side, which would waste a request
// per character typed below the 2-char minimum.
function LeadSearchResults({
  q,
  value,
  onChange,
  onSelect,
}: {
  q: string;
  value: string | null;
  onChange: (leadId: string, businessName: string) => void;
  onSelect: () => void;
}) {
  const { data, isFetching } = useLeads({ q, limit: 10 });
  const results = data?.items ?? [];

  if (results.length > 0) {
    return (
      <ul className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-1 rounded-md border p-1">
        {results.map((lead) => (
          <li key={lead.id}>
            <button
              type="button"
              onClick={() => {
                onChange(lead.id, lead.businessName);
                onSelect();
              }}
              className="hover:bg-(--color-bg-surface-raised) flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm"
              aria-current={value === lead.id ? 'true' : undefined}
            >
              <span className="text-(--color-text-primary) font-medium">{lead.businessName}</span>
              <span className="text-(--color-text-secondary) text-xs">{lead.city}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }
  if (!isFetching) {
    return (
      <p className="text-(--color-text-secondary) text-sm">No leads match &ldquo;{q}&rdquo;.</p>
    );
  }
  return null;
}
