import { withRetry } from './retry';

describe('withRetry', () => {
  it('returns the result on the first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { retries: 2, delayMs: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to the configured count, then succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { retries: 2, delayMs: 0 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error once retries are exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('permanent failure'));

    await expect(withRetry(fn, { retries: 2, delayMs: 0 })).rejects.toThrow('permanent failure');
    expect(fn).toHaveBeenCalledTimes(3); // initial attempt + 2 retries
  });
});
