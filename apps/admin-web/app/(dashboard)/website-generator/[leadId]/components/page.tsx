import { ComponentViewer } from '@/src/features/website-generator/components/component-viewer';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <ComponentViewer leadId={leadId} />;
}
