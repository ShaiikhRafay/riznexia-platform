import type { TeamRole } from '@riznexia/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { AnalyticsViewGate } from './analytics-view-gate';

function renderGate(role: TeamRole) {
  return render(
    <PermissionsProvider role={role}>
      <AnalyticsViewGate>
        <p>Real content</p>
      </AnalyticsViewGate>
    </PermissionsProvider>,
  );
}

describe('AnalyticsViewGate', () => {
  it('shows content for a role with analytics:view (viewer)', () => {
    renderGate('viewer');
    expect(screen.getByText('Real content')).toBeInTheDocument();
  });

  it('shows the fallback message, not the content, for a role without analytics:view (sales_executive)', () => {
    renderGate('sales_executive');
    expect(screen.queryByText('Real content')).not.toBeInTheDocument();
    expect(screen.getByText(/don.t have permission to view analytics/)).toBeInTheDocument();
  });
});
