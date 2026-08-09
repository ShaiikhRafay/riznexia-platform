import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsSubNav } from './settings-sub-nav';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/settings' } }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

describe('SettingsSubNav', () => {
  it('renders all eleven destinations with the real hrefs', () => {
    pathname.current = '/settings';
    render(<SettingsSubNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'Company' })).toHaveAttribute(
      'href',
      '/settings/company',
    );
    expect(screen.getByRole('link', { name: 'AI' })).toHaveAttribute('href', '/settings/ai');
    expect(screen.getByRole('link', { name: 'API Keys' })).toHaveAttribute(
      'href',
      '/settings/api-keys',
    );
    expect(screen.getByRole('link', { name: 'Prompts' })).toHaveAttribute(
      'href',
      '/settings/prompts',
    );
    expect(screen.getByRole('link', { name: 'Theme Defaults' })).toHaveAttribute(
      'href',
      '/settings/theme-defaults',
    );
    expect(screen.getByRole('link', { name: 'Deployment' })).toHaveAttribute(
      'href',
      '/settings/deployment',
    );
    expect(screen.getByRole('link', { name: 'Cost & Budget' })).toHaveAttribute(
      'href',
      '/settings/cost-budget',
    );
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute(
      'href',
      '/settings/analytics',
    );
    expect(screen.getByRole('link', { name: 'System' })).toHaveAttribute(
      'href',
      '/settings/system',
    );
    expect(screen.getByRole('link', { name: 'Audit History' })).toHaveAttribute(
      'href',
      '/settings/audit',
    );
  });

  it('marks only Dashboard as current on /settings exactly', () => {
    pathname.current = '/settings';
    render(<SettingsSubNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Company' })).not.toHaveAttribute('aria-current');
  });

  it('does not mark Dashboard current on a sub-route like /settings/company (exact match only)', () => {
    pathname.current = '/settings/company';
    render(<SettingsSubNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Company' })).toHaveAttribute('aria-current', 'page');
  });
});
