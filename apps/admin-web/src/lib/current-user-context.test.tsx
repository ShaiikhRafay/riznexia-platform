import { renderHook } from '@testing-library/react';
import type { TeamMember } from '@riznexia/shared-types';
import { describe, expect, it } from 'vitest';
import { CurrentUserProvider, useCurrentUser } from './current-user-context';

const CURRENT_USER: TeamMember = {
  id: 'member-1',
  name: 'Jane Rep',
  email: 'jane@riznexia.com',
  role: 'sales_executive',
};

describe('CurrentUserProvider / useCurrentUser', () => {
  it('throws when used outside a CurrentUserProvider', () => {
    const { result } = renderHook(() => {
      try {
        return { ok: useCurrentUser() };
      } catch (error) {
        return { error };
      }
    });
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns the exact TeamMember passed to the provider — no re-fetch, no transformation', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: ({ children }) => (
        <CurrentUserProvider currentUser={CURRENT_USER}>{children}</CurrentUserProvider>
      ),
    });
    expect(result.current).toEqual(CURRENT_USER);
  });
});
