import { processWithConcurrency } from './concurrency';

describe('processWithConcurrency', () => {
  it('processes every item exactly once', async () => {
    const processed: number[] = [];
    await processWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      processed.push(item);
    });
    expect(processed.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('never runs more than `concurrency` handlers at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    await processWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('handles an empty list without error', async () => {
    const handler = jest.fn();
    await processWithConcurrency([], 5, handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles concurrency greater than the item count', async () => {
    const processed: number[] = [];
    await processWithConcurrency([1, 2], 10, async (item) => {
      processed.push(item);
    });
    expect(processed.sort()).toEqual([1, 2]);
  });

  it("propagates a handler rejection to the caller (partial-failure handling is the caller's job)", async () => {
    await expect(
      processWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
