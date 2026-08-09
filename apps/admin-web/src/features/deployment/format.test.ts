import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDurationMs } from './format';

describe('formatDurationMs', () => {
  it('renders sub-second durations in milliseconds', () => {
    expect(formatDurationMs(500)).toBe('500ms');
    expect(formatDurationMs(999)).toBe('999ms');
  });

  it('renders durations of 1000ms or more in seconds, one decimal place', () => {
    expect(formatDurationMs(1000)).toBe('1.0s');
    expect(formatDurationMs(45230)).toBe('45.2s');
  });

  it('renders an em dash for null, never "nullms"', () => {
    expect(formatDurationMs(null)).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('renders a locale date-time string for a real ISO timestamp', () => {
    expect(formatDateTime('2026-01-01T00:00:00.000Z')).not.toBe('—');
  });

  it('renders an em dash for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});
