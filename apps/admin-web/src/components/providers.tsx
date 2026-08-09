'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster, TooltipProvider } from '@riznexia/ui';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { createQueryClient } from '@/src/lib/query-client';

// Module F1 — every client-only provider in one place, kept out of the
// server-component root layout. `useState(() => createQueryClient())`
// guarantees exactly one QueryClient per mount, never recreated on
// re-render and never a module-level singleton shared across requests
// (frontend architecture review §9).
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="riznexia-theme"
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
