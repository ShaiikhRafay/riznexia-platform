import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsSubNav } from './analytics-sub-nav';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/analytics' } }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

describe('AnalyticsSubNav', () => {
  it('renders all eight destinations with the real hrefs', () => {
    pathname.current = '/analytics';
    render(<AnalyticsSubNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/analytics');
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute(
      'href',
      '/analytics/reports',
    );
    expect(screen.getByRole('link', { name: 'Business' })).toHaveAttribute(
      'href',
      '/analytics/business',
    );
    expect(screen.getByRole('link', { name: 'Usage' })).toHaveAttribute('href', '/analytics/usage');
    expect(screen.getByRole('link', { name: 'System' })).toHaveAttribute(
      'href',
      '/analytics/system',
    );
    expect(screen.getByRole('link', { name: 'Costs' })).toHaveAttribute('href', '/analytics/costs');
    expect(screen.getByRole('link', { name: 'Audit Logs' })).toHaveAttribute(
      'href',
      '/analytics/audit',
    );
    expect(screen.getByRole('link', { name: 'User Activity' })).toHaveAttribute(
      'href',
      '/analytics/activity',
    );
  });

  it('marks only Dashboard as the current page when on /analytics exactly', () => {
    pathname.current = '/analytics';
    render(<AnalyticsSubNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Reports' })).not.toHaveAttribute('aria-current');
  });

  it('does not mark Dashboard current on a sub-route like /analytics/reports (exact match only)', () => {
    pathname.current = '/analytics/reports';
    render(<AnalyticsSubNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Audit Logs current on its own route', () => {
    pathname.current = '/analytics/audit';
    render(<AnalyticsSubNav />);
    expect(screen.getByRole('link', { name: 'Audit Logs' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
