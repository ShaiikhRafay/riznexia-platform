'use client';

import type { ThemeConfiguration } from '@riznexia/shared-types';
import { Button, ErrorState, Skeleton } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useBusinessAnalysis } from '@/src/features/business-analysis/api/use-business-analysis';
import { useThemeConfiguration } from '../api/use-theme-configuration';
import { SelectThemeButton } from './select-theme-button';

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-h2 text-(--color-text-primary) font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-(--color-text-secondary) shrink-0">{label}</span>
      <span className="text-(--color-text-primary) text-right">{children}</span>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-(--color-text-secondary)">{label}</span>
      {items.length > 0 ? (
        <ul className="text-(--color-text-primary) list-inside list-disc">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <span className="text-(--color-text-secondary)">None</span>
      )}
    </div>
  );
}

export interface ThemeDetailsProps {
  leadId: string;
}

// Theme Details (F7): displays every field `GET /leads/:id/theme`
// actually returns, plus the four brand-identity fields it carries
// through from M6 verbatim (industry/layoutStyle/colorPalette/
// typography). The remaining founder-requested brand fields (Brand
// Personality, Tone of Voice, Target Audience, Website Sections, CTA
// Recommendations) are NOT part of the theme response at all — verified
// directly against `themeConfigurationSchema` — so this page separately
// reuses F6's `useBusinessAnalysis()` hook (the same cross-feature
// hook-layer reuse F6 itself established) to read them off the lead's
// latest `BusinessAnalysis.brandBrief`. "Brand Style" from the founder's
// brief is not a real M6 or M7 field (verified against both schemas) and
// is not displayed, per this module's own "never invent data" rule.
export function ThemeDetails({ leadId }: ThemeDetailsProps) {
  const { data: themeConfig, isLoading, error, refetch } = useThemeConfiguration(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/theme-engine">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Theme Engine
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !themeConfig ? (
        <div className="flex flex-col gap-4">
          <p className="text-(--color-text-secondary) text-sm">
            No theme has been selected for this lead yet.
          </p>
          <SelectThemeButton leadId={leadId} hasExistingTheme={false} />
        </div>
      ) : (
        <ThemeContent leadId={leadId} themeConfig={themeConfig} />
      )}
    </div>
  );
}

function ThemeContent({
  leadId,
  themeConfig,
}: {
  leadId: string;
  themeConfig: ThemeConfiguration;
}) {
  const { data: businessAnalysis } = useBusinessAnalysis(leadId);
  const brief = businessAnalysis?.brandBrief ?? null;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">
          {themeConfig.themeName}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/theme-engine/${leadId}/configuration`}>View Configuration</Link>
          </Button>
          <SelectThemeButton leadId={leadId} hasExistingTheme />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailCard title="Theme Identity">
          <FieldRow label="Theme Name">{themeConfig.themeName}</FieldRow>
          <FieldRow label="Theme Version">{themeConfig.themeVersion}</FieldRow>
          <FieldRow label="Theme Hash">
            <span className="break-all font-mono text-xs">{themeConfig.themeHash}</span>
          </FieldRow>
          <FieldRow label="Compatibility Score">
            {themeConfig.compatibilityScore.toFixed(0)}/100
          </FieldRow>
          <FieldRow label="Selected At">
            {new Date(themeConfig.selectedAt).toLocaleString()}
          </FieldRow>
          <FieldRow label="Selected By Engine Version">
            {themeConfig.selectedByEngineVersion}
          </FieldRow>
        </DetailCard>

        <DetailCard title="Design (carried through from Theme Engine)">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-(--color-text-secondary)">Color Palette</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(themeConfig.colorPalette).map(([key, hex]) => (
                <span
                  key={key}
                  className="text-(--color-text-primary) flex items-center gap-1.5 text-xs"
                >
                  <span
                    className="border-(--color-border-default) h-4 w-4 rounded-full border"
                    style={{ backgroundColor: hex }}
                  />
                  {key}: {hex}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-(--color-text-secondary)">Typography</span>
            <span className="text-(--color-text-primary)">
              Heading: {themeConfig.typography.heading} &middot; Body: {themeConfig.typography.body}{' '}
              &middot; Accent: {themeConfig.typography.accent}
            </span>
          </div>
          <FieldRow label="Layout Style">{themeConfig.layoutStyle}</FieldRow>
        </DetailCard>
      </div>

      <DetailCard title="Brand Values — from AI Business Analyzer (M6), read-only">
        <p className="text-(--color-text-secondary) text-xs">
          These values originate from the AI Business Analyzer and cannot be edited within the Theme
          Engine.
        </p>
        {brief ? (
          <>
            <ListField label="Brand Personality" items={brief.brandPersonality} />
            <FieldRow label="Tone of Voice">{brief.toneOfVoice}</FieldRow>
            <ListField label="Target Audience" items={brief.targetAudience} />
            <ListField label="Website Sections" items={brief.websiteSections} />
            <ListField label="CTA Recommendations" items={brief.ctaRecommendations} />
          </>
        ) : (
          <p className="text-(--color-text-secondary) text-sm">
            No completed business analysis brand brief is currently available for this lead.
          </p>
        )}
      </DetailCard>
    </>
  );
}
