import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PeriodSelect } from './period-select';

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

describe('PeriodSelect', () => {
  it('defaults to showing Monthly', () => {
    render(<PeriodSelect />);
    expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument();
  });

  it('never offers Custom — there is no date-range picker for it yet', async () => {
    render(<PeriodSelect />);
    await userEvent.click(screen.getByRole('button', { name: /monthly/i }));
    expect(screen.queryByRole('menuitemradio', { name: /custom/i })).not.toBeInTheDocument();
  });

  it('pushes the selected period to the URL', async () => {
    render(<PeriodSelect />);
    await userEvent.click(screen.getByRole('button', { name: /monthly/i }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /weekly/i }));
    expect(push).toHaveBeenCalledWith('?period=weekly');
  });
});
