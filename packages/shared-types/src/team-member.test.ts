import { describe, expect, it } from 'vitest';
import { TEAM_ROLES, teamMemberSchema } from './team-member';

describe('teamMemberSchema', () => {
  const valid = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Jane Doe',
    email: 'jane@riznexia.com',
    role: 'admin',
  };

  it('accepts a well-formed team member for every valid role', () => {
    for (const role of TEAM_ROLES) {
      expect(teamMemberSchema.safeParse({ ...valid, role }).success).toBe(true);
    }
  });

  it('rejects a non-UUID id', () => {
    expect(teamMemberSchema.safeParse({ ...valid, id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(teamMemberSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a role outside the documented enum (e.g. a Prisma-cased value leaking through)', () => {
    expect(teamMemberSchema.safeParse({ ...valid, role: 'ADMIN' }).success).toBe(false);
  });
});
