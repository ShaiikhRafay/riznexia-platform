import { LeadDetailPage } from '@/src/features/leads/components/lead-detail-page';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <LeadDetailPage leadId={leadId} />;
}
