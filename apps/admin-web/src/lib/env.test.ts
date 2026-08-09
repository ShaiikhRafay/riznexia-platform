import { describe, expect, it, vi } from 'vitest';

// `env.ts` validates and freezes its config at module-load time (frontend
// architecture review §17: "fail fast ... rather than letting `undefined`
// silently reach a fetch() call"), so each scenario needs its own fresh
// module instance via `vi.resetModules()`.
describe('env', () => {
  it('exposes the configured API base URL', async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
    const { env } = await import('./env');
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('https://api.example.com');
  });

  it('throws a descriptive error at import time when the URL is missing', async () => {
    vi.resetModules();
    const original = process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    await expect(import('./env')).rejects.toThrow(/NEXT_PUBLIC_API_BASE_URL/);

    process.env.NEXT_PUBLIC_API_BASE_URL = original;
  });

  it('throws when the URL is present but not a valid URL', async () => {
    vi.resetModules();
    const original = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = 'not-a-url';

    await expect(import('./env')).rejects.toThrow(/Invalid environment configuration/);

    process.env.NEXT_PUBLIC_API_BASE_URL = original;
  });
});
