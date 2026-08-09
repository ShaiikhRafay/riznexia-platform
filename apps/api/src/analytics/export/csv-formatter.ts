// Module M12 (DECISIONS.md D-109) — pure CSV formatting behind the
// Export Engine. No external library — a well-defined RFC 4180-ish
// escaping rule is a handful of lines, not worth a dependency, matching
// this monorepo's own "no date library" precedent for similarly small,
// well-defined logic (bucket-math.ts).

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }
  const columns = Object.keys(rows[0] ?? {});
  const header = columns.map(escapeCsvCell).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(','));
  return [header, ...lines].join('\n');
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
  );
}

/**
 * A report's `data` shape varies per report type (§ReportingEngineService),
 * so this applies one consistent heuristic rather than fifteen bespoke
 * formatters: an array of objects becomes the CSV rows directly; an
 * object with exactly one array-of-objects property uses that property as
 * the rows (matches every report shape's own `byX: [...]` field); anything
 * else becomes a single-row CSV of its own top-level fields.
 */
export function toCsv(data: unknown): string {
  if (isRecordArray(data)) {
    return rowsToCsv(data);
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const arrayFields = Object.entries(record).filter(([, value]) => isRecordArray(value));
    if (arrayFields.length === 1) {
      const [, rows] = arrayFields[0] as [string, Record<string, unknown>[]];
      return rowsToCsv(rows);
    }
    return rowsToCsv([record]);
  }

  return rowsToCsv([{ value: data }]);
}
