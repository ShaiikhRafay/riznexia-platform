'use client';

import { ErrorState, Skeleton, toast } from '@riznexia/ui';
import Link from 'next/link';
import { useThemeConfiguration } from '@/src/features/theme-engine/api/use-theme-configuration';
import { ApiError } from '@/src/lib/api-client';
import { useAssembleWebsite } from '../api/use-assemble-website';
import { useBindContent } from '../api/use-bind-content';
import { useComponentManifest } from '../api/use-component-manifest';
import { useContentManifest } from '../api/use-content-manifest';
import { useGenerateComponents } from '../api/use-generate-components';
import { useGenerateLayout } from '../api/use-generate-layout';
import { useGeneratedWebsite } from '../api/use-generated-website';
import { useLayoutConfiguration } from '../api/use-layout-configuration';
import { PipelineStageCard } from './pipeline-stage-card';

export interface WebsitePipelinePanelProps {
  leadId: string;
  businessName: string;
}

function runStage(mutateAsync: () => Promise<unknown>, label: string) {
  mutateAsync()
    .then(() => toast.success(`${label} generated`))
    .catch((error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : `Could not generate ${label.toLowerCase()}.`;
      toast.error(message);
    });
}

// Website Generator Dashboard (F8): "Display generation status", "Generate
// Website", "Display generated version", "Display generator version" —
// implemented as four real pipeline stages (Layout → Component → Content
// → Website), each checking its own real backend precondition before
// offering its own real permission-gated Generate action, per the
// founder's approved resolution to the backend's hard dependency chain
// (see DECISIONS.md for this module). The final "Website" stage's button
// is the founder's literal "Generate Website" action.
export function WebsitePipelinePanel({ leadId, businessName }: WebsitePipelinePanelProps) {
  const theme = useThemeConfiguration(leadId);
  const layout = useLayoutConfiguration(leadId);
  const components = useComponentManifest(leadId);
  const content = useContentManifest(leadId);
  const website = useGeneratedWebsite(leadId);

  const generateLayout = useGenerateLayout(leadId);
  const generateComponents = useGenerateComponents(leadId);
  const bindContent = useBindContent(leadId);
  const assembleWebsite = useAssembleWebsite(leadId);

  if (theme.isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (theme.error) {
    return <ErrorState error={theme.error} onRetry={() => void theme.refetch()} />;
  }
  if (!theme.data) {
    return (
      <div className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-2 rounded-lg border p-4">
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">{businessName}</h2>
        <p className="text-(--color-text-secondary) text-sm">
          Website generation needs a selected theme first — none exists yet for this lead.
        </p>
        <Link
          href={`/theme-engine?leadId=${leadId}`}
          className="text-(--color-accent) self-start text-sm font-medium hover:underline"
        >
          Run Theme Selection
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-h2 text-(--color-text-primary) font-semibold">{businessName}</h2>

      <PipelineStageCard
        title="Layout"
        description="Generates page structure and section order from the selected theme."
        exists={!!layout.data}
        versionLabel={
          layout.data
            ? `Version ${layout.data.configVersion} · Engine ${layout.data.layoutEngineVersion}`
            : undefined
        }
        viewHref={layout.data ? `/website-generator/${leadId}/layout` : undefined}
        onGenerate={() => runStage(() => generateLayout.mutateAsync(), 'Layout')}
        isGenerating={generateLayout.isPending}
        permission="layout:generate"
      />

      <PipelineStageCard
        title="Components"
        description="Generates the component manifest from the layout."
        exists={!!components.data}
        versionLabel={
          components.data
            ? `Version ${components.data.configVersion} · Engine ${components.data.componentEngineVersion}`
            : undefined
        }
        viewHref={components.data ? `/website-generator/${leadId}/components` : undefined}
        onGenerate={() => runStage(() => generateComponents.mutateAsync(), 'Components')}
        isGenerating={generateComponents.isPending}
        permission="component:generate"
        blockedReason={!layout.data ? 'Requires Layout first' : undefined}
      />

      <PipelineStageCard
        title="Content"
        description="Binds real business content into the generated components."
        exists={!!content.data}
        versionLabel={
          content.data
            ? `Version ${content.data.configVersion} · Engine ${content.data.contentEngineVersion}`
            : undefined
        }
        viewHref={content.data ? `/website-generator/${leadId}/content` : undefined}
        onGenerate={() => runStage(() => bindContent.mutateAsync(), 'Content')}
        isGenerating={bindContent.isPending}
        permission="content:bind"
        blockedReason={!components.data ? 'Requires Components first' : undefined}
      />

      <PipelineStageCard
        title="Website"
        description="Assembles the final generated website project."
        exists={!!website.data}
        versionLabel={
          website.data
            ? `Version ${website.data.configVersion} · Engine ${website.data.assemblyEngineVersion}`
            : undefined
        }
        viewHref={website.data ? `/website-generator/${leadId}` : undefined}
        onGenerate={() => runStage(() => assembleWebsite.mutateAsync(), 'Website')}
        isGenerating={assembleWebsite.isPending}
        permission="website:assemble"
        blockedReason={!content.data ? 'Requires Content first' : undefined}
      />
    </div>
  );
}
