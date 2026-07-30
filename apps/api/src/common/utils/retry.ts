// Module M5 — "retry failed requests" (Doc 21 M5 entry). Deliberately
// generic and small: linear backoff, no jitter/circuit-breaker machinery
// the brief didn't ask for. Used around individual provider calls in
// PlaceSyncRunnerService, not around the whole run() — a candidate that
// still fails after retries is caught by the per-candidate try/catch
// (FR-1.8-equivalent for M5) rather than failing the whole sync job.
export interface RetryOptions {
  retries: number;
  delayMs: number;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.retries) {
        await sleep(options.delayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
