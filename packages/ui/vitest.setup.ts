import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL's own auto-cleanup doesn't reliably register itself under every
// vitest config shape (`globals: false` here) — registered explicitly so
// each test starts from an empty DOM, not the previous test's tree.
afterEach(() => {
  cleanup();
});

// jsdom has no real `matchMedia` implementation; `next-themes`/sonner both
// probe it on mount (light/dark/system detection). A minimal, inert stub is
// enough for component tests that never assert on actual media-query
// behavior.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
