// Bounded-concurrency processor — Doc 22 §9/§12: per-candidate Places calls
// within a discovery job are issued with a capped number in flight at once,
// not all fired simultaneously, to stay QPS-respectful of Google's API.
//
// NOTE: a rejected `handler` call propagates and stops remaining work in
// its worker lane. Doc 22 FR-1.8 requires one candidate's failure not to
// fail the whole discovery job — that's the caller's responsibility
// (catch inside `handler` itself), deliberately not built into this
// generic primitive.
export async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      await handler(items[index] as T);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
