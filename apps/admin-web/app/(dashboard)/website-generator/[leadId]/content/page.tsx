import { ContentViewer } from '@/src/features/website-generator/components/content-viewer';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <ContentViewer leadId={leadId} />;
}
