'use client';

import { AlertTriangle, Ban, Lock, ServerCrash, ShieldOff, WifiOff } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from './button';

// Mirrors the backend's uniform error envelope shape (docs/19-api-architecture.md
// §4: `{ error: { code, message, details } }`) structurally, without
// importing it — `packages/ui` never depends on an app's own types, so any
// app's own ApiError class works here as long as it carries these two
// fields (duck typing, not a shared class).
export interface ApiErrorLike {
  code?: string;
  message: string;
}

const KNOWN_CODE_PRESENTATION: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; title: string }
> = {
  UNAUTHENTICATED: { icon: Lock, title: 'Sign-in required' },
  FORBIDDEN: { icon: ShieldOff, title: "You don't have access to this" },
  VALIDATION_ERROR: { icon: AlertTriangle, title: 'Something needs fixing' },
  RATE_LIMITED: { icon: Ban, title: 'Too many requests' },
  INTERNAL_ERROR: { icon: ServerCrash, title: 'Something went wrong' },
  NETWORK_ERROR: { icon: WifiOff, title: "Can't reach the server" },
};

function presentationForCode(code: string | undefined): {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
} {
  if (code && code in KNOWN_CODE_PRESENTATION) {
    return KNOWN_CODE_PRESENTATION[code] as {
      icon: React.ComponentType<{ className?: string }>;
      title: string;
    };
  }
  // Module-specific codes not in the map above (e.g. LEAD_NOT_FOUND,
  // EXPORT_FORMAT_NOT_IMPLEMENTED) still render — with a generic icon/title
  // and the backend's own message, never a swallowed blank state.
  return { icon: AlertTriangle, title: 'This action couldn’t be completed' };
}

export interface ErrorStateProps {
  error: ApiErrorLike;
  onRetry?: () => void;
  className?: string;
}

// Inline error display for a failed query/mutation — distinct from the
// route-level error boundary (`app/error.tsx`), which only catches
// render-time crashes, not API errors (frontend architecture review §10).
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const { icon: Icon, title } = presentationForCode(error.code);
  return (
    <div
      role="alert"
      className={cn(
        'border-(--color-border-default) bg-(--color-bg-surface) flex flex-col items-center gap-3 rounded-md border p-8 text-center',
        className,
      )}
    >
      <Icon className="text-(--color-danger) h-8 w-8" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-h2 text-(--color-text-primary) font-semibold">{title}</p>
        <p className="text-(--color-text-secondary) text-sm">{error.message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
