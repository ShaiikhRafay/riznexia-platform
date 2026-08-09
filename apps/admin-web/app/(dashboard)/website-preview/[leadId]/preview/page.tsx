import { ResponsivePreview } from '@/src/features/website-preview/components/responsive-preview';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <ResponsivePreview leadId={leadId} />;
}
