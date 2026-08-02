'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SourcedTextList } from '@/lib/types';

export interface SearchFormProps {
  fields: SourcedTextList;
}

// No search-form field definitions exist anywhere in this pipeline yet
// (DECISIONS.md D-061 — structural form fields aren't sourced business
// content) — falls back to a single generic query field so the component
// is always real and functional, never a placeholder. Uses React Hook
// Form + Zod exactly as the phase's required tech stack specifies; submit
// is a client-side no-op (this assembler builds the site, not a backend
// search API).
export function SearchForm({ fields }: SearchFormProps) {
  const fieldNames = fields.value.length > 0 ? fields.value : ['query'];
  const schema = z.object(
    Object.fromEntries(fieldNames.map((name) => [name, z.string().min(1, 'Required')])),
  );
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(() => {
    // Intentionally client-side only — Website Assembly generates the
    // site, not a backend search endpoint.
  });

  return (
    <form onSubmit={onSubmit} noValidate className="gap-token-md flex flex-col" aria-label="Search">
      {fieldNames.map((name) => (
        <div key={name} className="gap-token-xs flex flex-col">
          <Label htmlFor={`search-${name}`}>{name.charAt(0).toUpperCase() + name.slice(1)}</Label>
          <Input
            id={`search-${name}`}
            {...register(name)}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={errors[name] ? `search-${name}-error` : undefined}
          />
          {errors[name] && (
            <p id={`search-${name}-error`} role="alert" className="text-sm text-red-600">
              {String(errors[name]?.message)}
            </p>
          )}
        </div>
      ))}
      <Button type="submit">Search</Button>
      {isSubmitSuccessful && <p role="status">Search submitted.</p>}
    </form>
  );
}
