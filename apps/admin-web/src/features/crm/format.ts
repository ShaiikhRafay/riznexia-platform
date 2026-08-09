// Feature-local duplicate of F2's own `format.ts` — same generic,
// domain-agnostic formatting helpers, needed here for the same
// `DashboardStats` shape (Reports/Dashboard). Not cross-imported: this
// codebase's reuse convention is at the hook/`api/` layer only.
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
