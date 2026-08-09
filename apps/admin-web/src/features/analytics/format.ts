const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const integerFormatter = new Intl.NumberFormat('en-US');

export function formatUsd(value: number): string {
  return currencyFormatter.format(value);
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

export function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

export function formatMs(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}
