import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TeamRole } from '@riznexia/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { SidebarNav } from './sidebar-nav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/leads',
}));

function renderAs(role: TeamRole, onNavigate?: () => void) {
  return render(
    <PermissionsProvider role={role}>
      <SidebarNav onNavigate={onNavigate} />
    </PermissionsProvider>,
  );
}

// Integration test: SidebarNav + the ambient PermissionsProvider + auth.ts's
// permission-driven nav table + Next's routing hooks composed together,
// rather than any one in isolation (RBAC Alignment, DECISIONS.md D-122).
describe('SidebarNav (integration)', () => {
  it('renders every nav item for admin, including Team and Sales CRM', () => {
    renderAs('admin');
    for (const label of [
      'Dashboard',
      'Discovery',
      'Leads',
      'Sales CRM',
      'Analytics',
      'Team',
      'Settings',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('hides Team, Settings, and Sales CRM from viewer, but still shows Analytics', () => {
    renderAs('viewer');
    expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sales CRM' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Analytics' })).toBeInTheDocument();
  });

  it('marks the item matching the current pathname as the active page', () => {
    renderAs('admin');
    expect(screen.getByRole('link', { name: 'Leads' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('calls onNavigate when a link is clicked (closes the mobile Sheet)', async () => {
    const onNavigate = vi.fn();
    renderAs('admin', onNavigate);

    await userEvent.click(screen.getByRole('link', { name: 'Discovery' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
