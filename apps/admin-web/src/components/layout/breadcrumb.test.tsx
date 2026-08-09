import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from './breadcrumb';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname }));

describe('Breadcrumb', () => {
  it('shows Dashboard at the root path', () => {
    usePathname.mockReturnValue('/');
    render(<Breadcrumb />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows the matching top-level nav label for a nested route', () => {
    usePathname.mockReturnValue('/leads/123/website');
    render(<Breadcrumb />);
    expect(screen.getByText('Leads')).toBeInTheDocument();
  });

  it('falls back to Dashboard for an unmatched path rather than rendering nothing', () => {
    usePathname.mockReturnValue('/some-unmapped-route');
    render(<Breadcrumb />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
