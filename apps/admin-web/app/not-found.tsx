import { Button } from '@riznexia/ui';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

// Next's own 404 convention, and where a domain-object 404 (e.g. the
// backend's LEAD_NOT_FOUND) routes to via `notFound()` from a feature
// module (frontend architecture review §10) — distinct from the crash
// boundary (app/error.tsx).
export default function NotFound() {
  return (
    <div className="bg-(--color-bg-canvas) flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <FileQuestion className="text-(--color-text-secondary) h-10 w-10" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-h1 text-(--color-text-primary) font-semibold">Page not found</p>
        <p className="text-(--color-text-secondary) max-w-sm text-sm">
          The page you're looking for doesn't exist or may have been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
