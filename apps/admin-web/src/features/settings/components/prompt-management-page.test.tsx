import type { TeamRole } from '@riznexia/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { PromptManagementPage } from './prompt-management-page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/prompts',
}));

function renderPage(role: TeamRole) {
  return render(
    <PermissionsProvider role={role}>
      <PromptManagementPage />
    </PermissionsProvider>,
  );
}

describe('PromptManagementPage', () => {
  it('links to Business Analysis instead of fabricating a global prompt registry', () => {
    renderPage('admin');
    expect(screen.getByText('Global Prompt Registry')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /View per-lead prompt metadata in Business Analysis/ }),
    ).toHaveAttribute('href', '/business-analysis');
  });

  it('blocks the whole page for a role without team:manage', () => {
    renderPage('developer');
    expect(screen.getByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
