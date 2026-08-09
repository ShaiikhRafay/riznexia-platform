import { describe, expect, it } from 'vitest';
import { formatDateTime, formatInteger, formatMs, formatPercent, formatUsd } from './format';

describe('formatUsd', () => {
  it('formats whole-dollar USD with no decimals', () => {
    expect(formatUsd(1234)).toBe('$1,234');
    expect(formatUsd(0)).toBe('$0');
  });
});

describe('formatInteger', () => {
  it('formats with thousands separators', () => {
    expect(formatInteger(1234567)).toBe('1,234,567');
  });
});

describe('formatPercent', () => {
  it('formats to one decimal place with a % sign', () => {
    expect(formatPercent(42.567)).toBe('42.6%');
  });

  it('renders an em dash for null, never "null%"', () => {
    expect(formatPercent(null)).toBe('—');
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

describe('formatMs', () => {
  it('renders sub-second durations in milliseconds', () => {
    expect(formatMs(500)).toBe('500ms');
  });

  it('renders durations of 1000ms or more in seconds', () => {
    expect(formatMs(2500)).toBe('2.5s');
  });

  it('renders an em dash for null', () => {
    expect(formatMs(null)).toBe('—');
  });
});
