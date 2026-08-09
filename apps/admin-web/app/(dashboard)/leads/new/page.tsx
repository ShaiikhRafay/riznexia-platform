import { auth } from '@clerk/nextjs/server';
import { teamMemberSchema, type TeamMember } from '@riznexia/shared-types';
import { CreateLeadPage } from '@/src/features/leads/components/create-lead-page';
import { apiClient } from '@/src/lib/api-client';
import { assertPermission } from '@/src/lib/route-guard';

// First real consumer of `assertPermission` (RBAC Alignment's route-guard.ts,
// built ahead of its own first user) — Create Lead needs `leads:write`, a
// stronger guard than "authenticated and provisioned", so a role without
// it hitting this URL directly gets `notFound()` rather than a client-side
// flash of the form before a permission check catches up.
export default async function Page() {
  const { getToken } = await auth();
  const token = await getToken();
  const currentUser = await apiClient.get<TeamMember>('/me', { token, schema: teamMemberSchema });
  assertPermission(currentUser.role, 'leads:write');

  return <CreateLeadPage />;
}
