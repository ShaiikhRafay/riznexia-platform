import { BusinessAnalysisHistory } from '@/src/features/business-analysis/components/business-analysis-history';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <BusinessAnalysisHistory leadId={leadId} />;
}
