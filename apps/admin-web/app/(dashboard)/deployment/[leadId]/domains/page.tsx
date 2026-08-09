import { DomainManagementPage } from '@/src/features/deployment/components/domain-management-page';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <DomainManagementPage leadId={leadId} />;
}
