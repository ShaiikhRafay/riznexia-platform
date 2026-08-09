// Pure unit-conversion display helpers — no business logic, no invented
// metrics. `executionDuration`/`responseTimeMs` are both stored in
// milliseconds (`execution_duration_ms` in `schema.prisma`).
export function formatDurationMs(ms: number | null): string {
  if (ms === null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}
