'use client';

import { leadTagSchema, MAX_TAGS_PER_LEAD } from '@riznexia/shared-types';
import { Button, Input } from '@riznexia/ui';
import { X } from 'lucide-react';
import { useState } from 'react';

export interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

// A plain, feature-local chip input for a lead's `tags: string[]` — the
// same shape as Discovery's `CategoryInput` but validated against
// `leadTagSchema` (trim/lowercase/character-allowlist/`TAG_MAX_LENGTH`)
// instead of accepting any string, since the backend itself normalizes and
// constrains tags this way. Not promoted to packages/ui: this is one
// form's domain-specific input, the same category as `CategoryInput`.
export function TagInput({ value, onChange, disabled }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const atLimit = value.length >= MAX_TAGS_PER_LEAD;

  function commitDraft() {
    const raw = draft.trim();
    if (!raw) {
      setDraft('');
      setError(null);
      return;
    }
    if (atLimit) {
      return;
    }
    const result = leadTagSchema.safeParse(raw);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid tag');
      return;
    }
    if (value.includes(result.data)) {
      setDraft('');
      setError(null);
      return;
    }
    onChange([...value, result.data]);
    setDraft('');
    setError(null);
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
        {value.map((tag, index) => (
          <span
            key={tag}
            className="bg-(--color-bg-surface-raised) text-caption text-(--color-text-primary) flex items-center gap-1 rounded-full px-2.5 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(index)}
              disabled={disabled}
              aria-label={`Remove ${tag}`}
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
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={
            atLimit ? `Maximum ${MAX_TAGS_PER_LEAD} tags` : 'e.g. vip — press Enter to add'
          }
          disabled={disabled || atLimit}
          aria-label="Add a tag"
          aria-invalid={!!error}
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
      {error ? <p className="text-(--color-danger) text-xs font-medium">{error}</p> : null}
    </div>
  );
}
