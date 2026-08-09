import { describe, expect, it } from 'vitest';
import { formatInteger, formatPercent, formatUsd } from './format';

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
