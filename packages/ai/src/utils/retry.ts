// Module M6 (D-040) — exponential backoff for transient provider failures
// (network/timeout/5xx), deliberately separate from apps/api's
// withRetry (M5, linear backoff) rather than extending that shared
// utility: keeping the two retry mechanisms in different packages makes
// the "transient retry vs. validation-repair retry" distinction (Doc 20
// §1) impossible to accidentally conflate, and packages/ai must stay
// usable by M7/M8 without an apps/api dependency.
export interface ExponentialBackoffOptions {
  retries: number;
  baseDelayMs: number;
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: ExponentialBackoffOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.retries) {
        await sleep(options.baseDelayMs * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
