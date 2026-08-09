import { DiscoveryJobDetail } from '@/src/features/discovery/components/discovery-job-detail';

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <DiscoveryJobDetail jobId={jobId} />;
}
