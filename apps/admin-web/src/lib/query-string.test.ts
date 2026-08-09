import { describe, expect, it } from 'vitest';
import { toQueryString } from './query-string';

describe('toQueryString', () => {
  it('builds a leading-? query string from a flat params object', () => {
    expect(toQueryString({ period: 'monthly', limit: 25 })).toBe('?period=monthly&limit=25');
  });

  it('skips undefined, null, and empty-string values entirely — never "a=undefined"', () => {
    expect(toQueryString({ a: undefined, b: null, c: '', d: 'kept' })).toBe('?d=kept');
  });

  it('returns an empty string (no bare "?") when every value is skipped', () => {
    expect(toQueryString({ a: undefined, b: null })).toBe('');
  });

  it('URL-encodes values that need it (application/x-www-form-urlencoded, via URLSearchParams)', () => {
    expect(toQueryString({ q: "Joe's Diner" })).toBe('?q=Joe%27s+Diner');
  });
});
