import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  RefreshIntervalProvider,
  useQueryRefetchInterval,
  useRefreshInterval,
} from './refresh-interval';

function wrapper({ children }: { children: React.ReactNode }) {
  return <RefreshIntervalProvider>{children}</RefreshIntervalProvider>;
}

describe('RefreshIntervalProvider / useRefreshInterval', () => {
  it('throws when used outside a RefreshIntervalProvider', () => {
    const { result } = renderHook(() => {
      try {
        return { ok: useRefreshInterval() };
      } catch (error) {
        return { error };
      }
    });
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('defaults to manual', () => {
    const { result } = renderHook(() => useRefreshInterval(), { wrapper });
    expect(result.current.interval).toBe('manual');
  });

  it('updates the shared interval when setInterval is called', () => {
    const { result } = renderHook(() => useRefreshInterval(), { wrapper });
    act(() => result.current.setInterval(60_000));
    expect(result.current.interval).toBe(60_000);
  });
});

describe('useQueryRefetchInterval', () => {
  it('maps manual to false — TanStack Query\'s "disable polling" value', () => {
    const { result } = renderHook(() => useQueryRefetchInterval(), { wrapper });
    expect(result.current).toBe(false);
  });

  it('passes a numeric interval straight through once selected', () => {
    const { result } = renderHook(
      () => ({ refetchInterval: useQueryRefetchInterval(), controls: useRefreshInterval() }),
      { wrapper },
    );
    expect(result.current.refetchInterval).toBe(false);

    act(() => result.current.controls.setInterval(30_000));
    expect(result.current.refetchInterval).toBe(30_000);
  });
});
