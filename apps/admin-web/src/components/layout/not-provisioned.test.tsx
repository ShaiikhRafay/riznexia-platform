import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotProvisioned } from './not-provisioned';

vi.mock('@clerk/nextjs', () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// The dedicated state for a valid-Clerk-session-but-no-TeamMember-row case
// (dashboard layout §84) — verified as a standalone render since the
// server-component layout that decides to show it isn't itself
// RTL-renderable (frontend architecture review's own testing limitation,
// documented in the F1 review).
describe('NotProvisioned', () => {
  it('explains the account is not linked yet, without implying a generic error', () => {
    render(<NotProvisioned />);
    expect(screen.getByText('Account not provisioned yet')).toBeInTheDocument();
    expect(screen.getByText(/no Riznexia team account is linked/i)).toBeInTheDocument();
  });

  it('offers a sign-out action to let the person try a different account', () => {
    render(<NotProvisioned />);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
