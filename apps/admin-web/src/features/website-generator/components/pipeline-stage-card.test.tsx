import type { TeamRole } from '@riznexia/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { PipelineStageCard } from './pipeline-stage-card';

function renderCard(
  role: TeamRole,
  overrides: Partial<Parameters<typeof PipelineStageCard>[0]> = {},
) {
  const onGenerate = vi.fn();
  render(
    <PermissionsProvider role={role}>
      <PipelineStageCard
        title="Layout"
        description="Generates page structure."
        exists={false}
        onGenerate={onGenerate}
        isGenerating={false}
        permission="layout:generate"
        {...overrides}
      />
    </PermissionsProvider>,
  );
  return onGenerate;
}

describe('PipelineStageCard', () => {
  it('shows "Not generated" and a Generate button for a role with the permission', () => {
    renderCard('admin');
    expect(screen.getByText('Not generated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Layout' })).toBeInTheDocument();
  });

  it('shows "Generated" and version info once the resource exists', () => {
    renderCard('admin', {
      exists: true,
      versionLabel: 'Version 1 · Engine v1.0',
      viewHref: '/website-generator/lead-1/layout',
    });
    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.getByText('Version 1 · Engine v1.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/website-generator/lead-1/layout',
    );
    expect(screen.getByRole('button', { name: 'Re-generate Layout' })).toBeInTheDocument();
  });

  it('hides the Generate button entirely for a role without the permission', () => {
    renderCard('developer');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a blocked-reason message instead of the button when a prerequisite is missing', () => {
    renderCard('admin', { blockedReason: 'Requires Layout first' });
    expect(screen.getByText('Requires Layout first')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onGenerate when clicked', async () => {
    const onGenerate = renderCard('admin');
    await userEvent.click(screen.getByRole('button', { name: 'Generate Layout' }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });
});
