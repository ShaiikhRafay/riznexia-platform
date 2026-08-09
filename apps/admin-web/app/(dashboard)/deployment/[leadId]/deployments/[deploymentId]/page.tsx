import { DeploymentDetailsPage } from '@/src/features/deployment/components/deployment-details-page';

export default async function Page({
  params,
}: {
  params: Promise<{ leadId: string; deploymentId: string }>;
}) {
  const { leadId, deploymentId } = await params;
  return <DeploymentDetailsPage leadId={leadId} deploymentId={deploymentId} />;
}
