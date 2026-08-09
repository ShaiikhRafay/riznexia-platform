'use client';

import { Button, ErrorState, Skeleton } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useThemeConfiguration } from '../api/use-theme-configuration';

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

export interface ThemeConfigurationPageProps {
  leadId: string;
}

// Theme Configuration (F7): "Display the generated ThemeConfiguration...
// Read-only. No editing." — there is no edit affordance anywhere on this
// page, matching the founder's instruction exactly (there is also no
// backend PATCH/PUT endpoint for this resource at all, so nothing to
// wire an edit form to even if one were built).
//
// "Compatibility validation results" has no literal backend field — no
// `validationErrors`/`validationResults` exists on `ThemeConfiguration`
// (unlike M6's `BusinessAnalysis.validationErrors`). The closest real
// substitute is `rankedThemes` (every theme that cleared the minimum
// compatibility score, sorted descending — the selected theme is always
// rank 1), labeled honestly as "Other Themes Considered" rather than
// "Validation Results", since it answers a related but different
// question (what else was close) — see DECISIONS.md for this module.
export function ThemeConfigurationPage({ leadId }: ThemeConfigurationPageProps) {
  const { data: themeConfig, isLoading, error, refetch } = useThemeConfiguration(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/theme-engine/${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Theme Details
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Theme Configuration</h1>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !themeConfig ? (
        <p className="text-(--color-text-secondary) text-sm">
          No theme has been selected for this lead yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard title="Theme Metadata">
            <FieldRow label="Theme ID">{themeConfig.themeId}</FieldRow>
            <FieldRow label="Configuration Version">{themeConfig.configVersion}</FieldRow>
            <FieldRow label="Business Analysis ID">
              <span className="break-all font-mono text-xs">{themeConfig.businessAnalysisId}</span>
            </FieldRow>
            <FieldRow label="Created">{new Date(themeConfig.createdAt).toLocaleString()}</FieldRow>
          </DetailCard>

          <DetailCard title="Selected Components">
            <ListField label="Component Set" items={themeConfig.componentSet} />
            <ListField label="Section Order" items={themeConfig.sectionOrder} />
          </DetailCard>

          <DetailCard title="Theme Configuration Summary">
            <FieldRow label="Navigation Style">{themeConfig.navigationStyle}</FieldRow>
            <FieldRow label="Hero Style">{themeConfig.heroStyle}</FieldRow>
            <FieldRow label="CTA Style">{themeConfig.ctaStyle}</FieldRow>
            <FieldRow label="Card Style">{themeConfig.cardStyle}</FieldRow>
            <FieldRow label="Footer Style">{themeConfig.footerStyle}</FieldRow>
            <FieldRow label="Animation Level">{themeConfig.animationLevel}</FieldRow>
            <FieldRow label="Image Style">{themeConfig.imageStyle}</FieldRow>
          </DetailCard>

          <DetailCard title="Accessibility &amp; Mobile">
            <FieldRow label="Contrast Level">
              {themeConfig.accessibilityProfile.contrastLevel}
            </FieldRow>
            <FieldRow label="Min Touch Target">
              {themeConfig.accessibilityProfile.minTouchTargetPx}px
            </FieldRow>
            <FieldRow label="Reduced Motion Support">
              {themeConfig.accessibilityProfile.reducedMotionSupport ? 'Yes' : 'No'}
            </FieldRow>
            <FieldRow label="Alt Text Required">
              {themeConfig.accessibilityProfile.altTextRequired ? 'Yes' : 'No'}
            </FieldRow>
            <FieldRow label="Mobile Navigation">
              {themeConfig.mobilePreferences.navigationPattern}
            </FieldRow>
            <FieldRow label="Stacked Layout">
              {themeConfig.mobilePreferences.stackedLayout ? 'Yes' : 'No'}
            </FieldRow>
            <FieldRow label="Tap Target Size">
              {themeConfig.mobilePreferences.tapTargetSizePx}px
            </FieldRow>
          </DetailCard>

          <DetailCard title="Other Themes Considered">
            {themeConfig.rankedThemes.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm">
                {themeConfig.rankedThemes.map((entry) => (
                  <li key={entry.themeId} className="flex items-center justify-between">
                    <span className="text-(--color-text-primary)">
                      #{entry.rank} {entry.themeName} ({entry.themeVersion})
                    </span>
                    <span className="text-(--color-text-secondary)">
                      {entry.compatibilityScore.toFixed(0)}/100
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-(--color-text-secondary) text-sm">No ranking data was returned.</p>
            )}
          </DetailCard>

          {themeConfig.aiRecommendationProvider ? (
            <DetailCard title="AI Recommendation">
              <FieldRow label="Provider">{themeConfig.aiRecommendationProvider}</FieldRow>
              <FieldRow label="Model">{themeConfig.aiRecommendationModel ?? '—'}</FieldRow>
              <FieldRow label="Total Tokens">
                {themeConfig.aiRecommendationTotalTokens ?? '—'}
              </FieldRow>
              <FieldRow label="Estimated Cost">
                {themeConfig.aiRecommendationCostUsd !== null
                  ? `$${themeConfig.aiRecommendationCostUsd.toFixed(4)}`
                  : '—'}
              </FieldRow>
              <FieldRow label="Execution Time">
                {themeConfig.aiRecommendationExecutionTimeMs !== null
                  ? `${(themeConfig.aiRecommendationExecutionTimeMs / 1000).toFixed(1)}s`
                  : '—'}
              </FieldRow>
            </DetailCard>
          ) : null}
        </div>
      )}
    </div>
  );
}
