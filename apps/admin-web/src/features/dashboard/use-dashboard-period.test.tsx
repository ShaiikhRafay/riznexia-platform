import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardPeriod } from './use-dashboard-period';

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

describe('useDashboardPeriod', () => {
  beforeEach(() => {
    push.mockClear();
    for (const key of Array.from(searchParams.keys())) {
      searchParams.delete(key);
    }
  });

  it('defaults to monthly with no fromDate/toDate when the URL has no period param', () => {
    const { result } = renderHook(() => useDashboardPeriod());
    expect(result.current.options).toEqual({
      period: 'monthly',
      fromDate: undefined,
      toDate: undefined,
    });
  });

  it('reads a valid period from the URL', () => {
    searchParams.set('period', 'weekly');
    const { result } = renderHook(() => useDashboardPeriod());
    expect(result.current.options.period).toBe('weekly');
  });

  it('falls back to monthly for an invalid/unrecognized period value, never crashing', () => {
    searchParams.set('period', 'fortnightly');
    const { result } = renderHook(() => useDashboardPeriod());
    expect(result.current.options.period).toBe('monthly');
  });

  it('setPeriod pushes the new period into the URL', () => {
    const { result } = renderHook(() => useDashboardPeriod());
    act(() => result.current.setPeriod('yearly'));
    expect(push).toHaveBeenCalledWith('?period=yearly');
  });

  it('setPeriod clears from/to when switching away from custom', () => {
    searchParams.set('period', 'custom');
    searchParams.set('from', '2026-01-01T00:00:00.000Z');
    searchParams.set('to', '2026-02-01T00:00:00.000Z');
    const { result } = renderHook(() => useDashboardPeriod());

    act(() => result.current.setPeriod('daily'));

    const pushedUrl = push.mock.calls.at(-1)?.[0] as string;
    expect(pushedUrl).toContain('period=daily');
    expect(pushedUrl).not.toContain('from=');
    expect(pushedUrl).not.toContain('to=');
  });
});
