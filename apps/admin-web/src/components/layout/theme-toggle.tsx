'use client';

import { Button } from '@riznexia/ui';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

// Client-persisted only (localStorage via next-themes), not synced through
// `TeamMember` — a deliberate deviation from the pre-existing docs/17 §16
// spec, forced by the frozen backend having no such column (frontend
// architecture review §8).
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a hydration mismatch: the server has no way to know the
  // client's persisted theme before next-themes' inline script runs.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Moon className="h-5 w-5" aria-hidden="true" />
        )
      ) : (
        <span className="h-5 w-5" />
      )}
    </Button>
  );
}
