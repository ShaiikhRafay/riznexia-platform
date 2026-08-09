import { BusinessAnalysisDetails } from '@/src/features/business-analysis/components/business-analysis-details';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <BusinessAnalysisDetails leadId={leadId} />;
}
