import { GeneratedWebsiteOverview } from '@/src/features/website-generator/components/generated-website-overview';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <GeneratedWebsiteOverview leadId={leadId} />;
}
