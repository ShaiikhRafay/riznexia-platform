import { ThemeDetails } from '@/src/features/theme-engine/components/theme-details';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <ThemeDetails leadId={leadId} />;
}
