// Health Monitoring (F11): `DeploymentHealthCheck.detail` is typed as
// `Record<string, unknown> | null` on the wire — genuinely arbitrary JSON
// from the schema's own point of view. Verified directly against
// `health-check-engine.service.ts`'s `runCheck()`, the backend always
// writes `{ checks: [{ name, passed, detail? }] }` (deployment_status,
// website_reachable, domain_status, ssl_status) — but this parses it
// defensively rather than trusting that shape blindly, so a malformed or
// future-shaped `detail` blob degrades to an empty list instead of
// crashing the page.
export interface HealthCheckDetailItem {
  name: string;
  passed: boolean;
}

export function parseHealthCheckDetail(
  detail: Record<string, unknown> | null,
): HealthCheckDetailItem[] {
  if (!detail || !Array.isArray(detail.checks)) {
    return [];
  }
  const items: HealthCheckDetailItem[] = [];
  for (const entry of detail.checks) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as { name?: unknown }).name === 'string' &&
      typeof (entry as { passed?: unknown }).passed === 'boolean'
    ) {
      items.push({
        name: (entry as { name: string }).name,
        passed: (entry as { passed: boolean }).passed,
      });
    }
  }
  return items;
}
