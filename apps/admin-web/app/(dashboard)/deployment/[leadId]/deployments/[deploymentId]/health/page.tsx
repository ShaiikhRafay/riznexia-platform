import { HealthMonitoringPage } from '@/src/features/deployment/components/health-monitoring-page';

export default async function Page({
  params,
}: {
  params: Promise<{ leadId: string; deploymentId: string }>;
}) {
  const { leadId, deploymentId } = await params;
  return <HealthMonitoringPage leadId={leadId} deploymentId={deploymentId} />;
}
