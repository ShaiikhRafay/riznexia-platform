import { LayoutViewer } from '@/src/features/website-generator/components/layout-viewer';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <LayoutViewer leadId={leadId} />;
}
