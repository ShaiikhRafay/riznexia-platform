import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearch } from './global-search';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('GlobalSearch', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('navigates to /leads?q=<term> using the backend’s real `q` param, not `search`', async () => {
    render(<GlobalSearch />);
    const input = screen.getByRole('searchbox', { name: 'Search leads' });

    await userEvent.type(input, "Joe's Diner{enter}");

    expect(push).toHaveBeenCalledWith(`/leads?q=${encodeURIComponent("Joe's Diner")}`);
  });

  it('does not navigate for a term shorter than 2 characters (matches listLeadsQuerySchema’s min(2))', async () => {
    render(<GlobalSearch />);
    const input = screen.getByRole('searchbox', { name: 'Search leads' });

    await userEvent.type(input, 'a{enter}');

    expect(push).not.toHaveBeenCalled();
  });
});
