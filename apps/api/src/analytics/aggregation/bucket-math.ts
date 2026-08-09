import type { AggregationPeriod } from '@riznexia/shared-types';

// Module M12 (DECISIONS.md D-107) — pure date-bucketing math behind the
// Aggregation Engine. No date library exists anywhere in this monorepo
// (cost.service.ts's own `secondsUntilNextUtcMonth()` already hand-rolls
// UTC month math the same way), so this follows that precedent rather
// than introducing a new dependency for a handful of well-defined
// calendar operations. Everything is computed in UTC — deliberately, so
// a bucket boundary never depends on the server's local timezone.

export const MS_PER_DAY = 86_400_000;

// `custom` has no fixed granularity of its own — the founder listed it as
// a peer of daily/weekly/monthly/yearly, not a sixth granularity, so a
// custom range is bucketed at whichever of the other four best fits its
// span: short ranges get daily resolution, long ranges get yearly,
// otherwise the trend chart would be either one giant bucket or
// thousands of daily slivers.
export function granularityForSpan(from: Date, to: Date): Exclude<AggregationPeriod, 'custom'> {
  const spanDays = (to.getTime() - from.getTime()) / MS_PER_DAY;
  if (spanDays <= 31) return 'daily';
  if (spanDays <= 180) return 'weekly';
  if (spanDays <= 730) return 'monthly';
  return 'yearly';
}

/** ISO week (Monday start) key, e.g. "2026-W32". */
function isoWeekKey(date: Date): string {
  const start = startOfIsoWeek(date);
  // ISO week number of `start`'s own week.
  const jan4 = new Date(Date.UTC(start.getUTCFullYear(), 0, 4));
  const jan4Week = startOfIsoWeek(jan4);
  const weekNumber = Math.round((start.getTime() - jan4Week.getTime()) / (7 * MS_PER_DAY)) + 1;
  return `${start.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function startOfIsoWeek(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday
  const mondayOffset = (dayOfWeek + 6) % 7;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - mondayOffset);
  return start;
}

export function bucketKeyFor(date: Date, period: Exclude<AggregationPeriod, 'custom'>): string {
  switch (period) {
    case 'daily':
      return date.toISOString().slice(0, 10);
    case 'weekly':
      return isoWeekKey(date);
    case 'monthly':
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    case 'yearly':
      return String(date.getUTCFullYear());
  }
}

export function bucketBounds(
  key: string,
  period: Exclude<AggregationPeriod, 'custom'>,
): { start: Date; end: Date } {
  switch (period) {
    case 'daily': {
      const start = new Date(`${key}T00:00:00.000Z`);
      return { start, end: new Date(start.getTime() + MS_PER_DAY - 1) };
    }
    case 'weekly': {
      const [yearStr, weekStr] = key.split('-W');
      const year = Number(yearStr);
      const week = Number(weekStr);
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const jan4Week = startOfIsoWeek(jan4);
      const start = new Date(jan4Week.getTime() + (week - 1) * 7 * MS_PER_DAY);
      return { start, end: new Date(start.getTime() + 7 * MS_PER_DAY - 1) };
    }
    case 'monthly': {
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr) - 1;
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month + 1, 1) - 1);
      return { start, end };
    }
    case 'yearly': {
      const year = Number(key);
      return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1) - 1) };
    }
  }
}

/** Every bucket key that overlaps `[from, to]`, in chronological order. */
export function enumerateBucketKeys(
  from: Date,
  to: Date,
  period: Exclude<AggregationPeriod, 'custom'>,
): string[] {
  const keys: string[] = [];
  let cursorKey = bucketKeyFor(from, period);
  let cursor = bucketBounds(cursorKey, period).start;
  // Guard against a pathological range producing an unbounded loop —
  // no legitimate report needs more than ~10 years of daily buckets.
  const MAX_BUCKETS = 3700;
  while (cursor.getTime() <= to.getTime() && keys.length < MAX_BUCKETS) {
    cursorKey = bucketKeyFor(cursor, period);
    keys.push(cursorKey);
    cursor = new Date(bucketBounds(cursorKey, period).end.getTime() + 1);
  }
  return keys;
}
