import { LeadCrmDetailsPage } from '@/src/features/crm/components/lead-crm-details-page';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <LeadCrmDetailsPage leadId={leadId} />;
}
