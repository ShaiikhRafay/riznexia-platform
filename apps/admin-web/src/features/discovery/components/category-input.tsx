'use client';

import { Button, Input } from '@riznexia/ui';
import { X } from 'lucide-react';
import { useState } from 'react';

export interface CategoryInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  disabled?: boolean;
}

// A plain, feature-local chip input for `createDiscoveryJobSchema`'s
// `categories: string[]` (1-5 entries) — narrow enough to this one form
// that it isn't promoted to packages/ui (unlike StatusBadge/DataTable,
// nothing else in this codebase needs a generic tag input yet).
export function CategoryInput({ value, onChange, max, disabled }: CategoryInputProps) {
  const [draft, setDraft] = useState('');
  const atLimit = value.length >= max;

  function commitDraft() {
    const trimmed = draft.trim();
    if (!trimmed || atLimit || value.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitDraft();
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((category, index) => (
          <span
            key={category}
            className="bg-(--color-bg-surface-raised) text-caption text-(--color-text-primary) flex items-center gap-1 rounded-full px-2.5 py-1"
          >
            {category}
            <button
              type="button"
              onClick={() => removeAt(index)}
              disabled={disabled}
              aria-label={`Remove ${category}`}
              className="text-(--color-text-secondary) hover:text-(--color-danger) focus-visible:ring-(--color-accent) rounded-full focus-visible:outline-none focus-visible:ring-2"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={
            atLimit ? `Maximum ${max} categories` : 'e.g. restaurant — press Enter to add'
          }
          disabled={disabled || atLimit}
          aria-label="Add a category"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={commitDraft}
          disabled={disabled || atLimit || !draft.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
