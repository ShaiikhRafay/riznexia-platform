import { ThemeConfigurationPage } from '@/src/features/theme-engine/components/theme-configuration-page';

export default async function Page({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <ThemeConfigurationPage leadId={leadId} />;
}
