'use client';

// Fires only if the root layout itself throws (Next.js requires this exact
// file name/shape) — deliberately self-contained with inline styles rather
// than @riznexia/ui, since a crash this deep means the design system's own
// providers may never have mounted.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '20px', fontWeight: 600 }}>Riznexia failed to load</p>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>Please reload the page.</p>
          <button
            onClick={reset}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              borderRadius: '6px',
              background: '#c99a3e',
              color: '#16223a',
              border: 'none',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
