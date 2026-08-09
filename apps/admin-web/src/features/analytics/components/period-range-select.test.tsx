import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeriodRangeSelect } from './period-range-select';

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

describe('PeriodRangeSelect', () => {
  beforeEach(() => {
    push.mockClear();
    for (const key of Array.from(searchParams.keys())) {
      searchParams.delete(key);
    }
  });

  it('shows all five real backend filters, including Custom Range — never an invented one', async () => {
    render(<PeriodRangeSelect />);
    await userEvent.click(screen.getByRole('button', { name: /Monthly/ }));
    expect(screen.getByRole('menuitemradio', { name: 'Daily' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Weekly' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Yearly' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Custom Range' })).toBeInTheDocument();
  });

  it('does not show date inputs when the period is not custom', () => {
    render(<PeriodRangeSelect />);
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('To')).not.toBeInTheDocument();
  });

  it('shows real From/To date inputs once period=custom is in the URL', () => {
    searchParams.set('period', 'custom');
    render(<PeriodRangeSelect />);
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('disables Apply until both From and To are filled', () => {
    searchParams.set('period', 'custom');
    render(<PeriodRangeSelect />);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('pushes period=custom&from=&to= once Apply is clicked with both dates filled', async () => {
    searchParams.set('period', 'custom');
    render(<PeriodRangeSelect />);

    await userEvent.type(screen.getByLabelText('From'), '2026-01-01');
    await userEvent.type(screen.getByLabelText('To'), '2026-01-31');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    const pushedUrl = push.mock.calls.at(-1)?.[0] as string;
    expect(pushedUrl).toContain('period=custom');
    expect(pushedUrl).toContain('from=');
    expect(pushedUrl).toContain('to=');
  });
});
