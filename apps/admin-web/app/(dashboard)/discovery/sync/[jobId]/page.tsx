import { PlaceSyncJobDetail } from '@/src/features/place-sync/components/place-sync-job-detail';

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <PlaceSyncJobDetail jobId={jobId} />;
}
