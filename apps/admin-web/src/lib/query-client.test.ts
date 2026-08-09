import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client';
import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  it('creates a fresh QueryClient instance on every call (no module-level singleton)', () => {
    const a = createQueryClient();
    const b = createQueryClient();
    expect(a).not.toBe(b);
  });

  it('never retries a 4xx ApiError — it is never transient', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe('function');

    const forbidden = new ApiError({ code: 'FORBIDDEN', message: 'nope', status: 403 });
    expect((retry as (count: number, error: unknown) => boolean)(0, forbidden)).toBe(false);
  });

  it('retries a network/5xx failure up to 2 times', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean;

    const serverError = new ApiError({ code: 'INTERNAL_ERROR', message: 'boom', status: 500 });
    expect(retry(0, serverError)).toBe(true);
    expect(retry(1, serverError)).toBe(true);
    expect(retry(2, serverError)).toBe(false);
  });

  it('never retries mutations', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
