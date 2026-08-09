import { auth } from '@clerk/nextjs/server';
import { teamMemberSchema, type TeamMember } from '@riznexia/shared-types';
import { EditLeadPage } from '@/src/features/leads/components/edit-lead-page';
import { apiClient } from '@/src/lib/api-client';
import { assertPermission } from '@/src/lib/route-guard';

// Same route-guard rationale as `/leads/new` — Edit Lead needs
// `leads:write`.
export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const currentUser = await apiClient.get<TeamMember>('/me', { token, schema: teamMemberSchema });
  assertPermission(currentUser.role, 'leads:write');

  return <EditLeadPage leadId={leadId} />;
}
