import { ValidationReport } from '@/src/features/website-preview/components/validation-report';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <ValidationReport leadId={leadId} />;
}
