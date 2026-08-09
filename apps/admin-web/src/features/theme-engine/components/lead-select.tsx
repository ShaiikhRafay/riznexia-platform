'use client';

import { Input } from '@riznexia/ui';
import { useEffect, useState } from 'react';
import { useLeads } from '@/src/features/leads/api/use-leads';

export interface LeadSelectProps {
  value: string | null;
  onChange: (leadId: string, businessName: string) => void;
}

// Select Lead (F7 Dashboard feature): reuses F4's `useLeads()` directly,
// same as F6's own `LeadSelect`. Deliberately a feature-local duplicate,
// not a cross-feature import of F6's component — this codebase's only
// established reuse convention is at the hook/`api/` layer (F6 reusing
// F4's leads hooks; this file reusing the same hook again), never across
// a `components/` tree, so this mirrors that pattern rather than
// introducing a new one.
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
