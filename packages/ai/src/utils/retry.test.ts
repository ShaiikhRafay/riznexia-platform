import { describe, expect, it, vi } from 'vitest';
import { withExponentialBackoff } from './retry';

describe('withExponentialBackoff', () => {
  it('returns the result on first-try success without sleeping', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withExponentialBackoff(fn, { retries: 2, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries with doubling delay and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('ok');

    const result = await withExponentialBackoff(fn, { retries: 2, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error once retries are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent failure'));
    await expect(withExponentialBackoff(fn, { retries: 2, baseDelayMs: 1 })).rejects.toThrow(
      'permanent failure',
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
