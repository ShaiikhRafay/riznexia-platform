'use client';

import { Button } from '@riznexia/ui';
import { AlertOctagon } from 'lucide-react';
import { useEffect } from 'react';

// Catches render-time crashes only — never a query/mutation error, which
// renders inline via <ErrorState> instead (frontend architecture review
// §10). Next.js requires this file to be a Client Component and to accept
// exactly this {error, reset} prop shape.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-(--color-bg-canvas) flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertOctagon className="text-(--color-danger) h-10 w-10" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-h1 text-(--color-text-primary) font-semibold">Something went wrong</p>
        <p className="text-(--color-text-secondary) max-w-sm text-sm">
          An unexpected error occurred. Reloading usually fixes it — if it keeps happening, let the
          team know.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
