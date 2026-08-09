import { DeploymentHistoryPage } from '@/src/features/deployment/components/deployment-history-page';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <DeploymentHistoryPage leadId={leadId} />;
}
