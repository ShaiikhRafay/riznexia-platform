import type { TeamRole } from '@riznexia/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { AnalyticsReportGate } from './analytics-report-gate';

function renderGate(role: TeamRole) {
  return render(
    <PermissionsProvider role={role}>
      <AnalyticsReportGate>
        <p>Real report content</p>
      </AnalyticsReportGate>
    </PermissionsProvider>,
  );
}

// `analytics:report` is stricter than `analytics:view` — developer/viewer
// hold the latter but not the former, matching the real backend split
// (`GET /analytics/dashboard` vs `GET /analytics/reports/:type`).
describe('AnalyticsReportGate', () => {
  it('shows content for a role with analytics:report (admin)', () => {
    renderGate('admin');
    expect(screen.getByText('Real report content')).toBeInTheDocument();
  });

  it('hides content for a role with only analytics:view, not analytics:report (viewer)', () => {
    renderGate('viewer');
    expect(screen.queryByText('Real report content')).not.toBeInTheDocument();
    expect(
      screen.getByText(/don.t have permission to view full analytics reports/),
    ).toBeInTheDocument();
  });

  it('hides content for a role with only analytics:view, not analytics:report (developer)', () => {
    renderGate('developer');
    expect(screen.queryByText('Real report content')).not.toBeInTheDocument();
  });
});
