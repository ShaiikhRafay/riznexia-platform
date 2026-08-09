import { PublishReadiness } from '@/src/features/website-preview/components/publish-readiness';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <PublishReadiness leadId={leadId} />;
}
