import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

// Module F1 — one factory, called once per request via `useState(() => ...)`
// in `Providers` (frontend architecture review §9): a module-level
// singleton would leak query cache across requests on the server, the
// well-known App Router pitfall this factory pattern avoids.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // A 4xx is never transient — retrying it just repeats the same
          // rejection (wrong permission, bad input, not found). Only
          // network/5xx failures are worth a couple of automatic retries.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
