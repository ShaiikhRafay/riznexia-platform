'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import Link from 'next/link';
import { useBusinessAnalysis } from '@/src/features/business-analysis/api/use-business-analysis';
import { useThemeConfiguration } from '../api/use-theme-configuration';
import { SelectThemeButton } from './select-theme-button';

export interface ThemeStatusPanelProps {
  leadId: string;
  businessName: string;
}

// Theme Selection Dashboard (F7): "Display current theme status", "Run/
// Re-run Theme Selection", "Display compatibility score", "Display
// selected theme", "Display engine version", "Display theme version" —
// all for the currently-selected lead.
//
// `POST /leads/:id/theme` throws `BusinessAnalysisNotFoundException` when
// no completed business analysis exists yet for the lead (verified
// against `theme-selection.service.ts` directly) — rather than letting a
// user hit that error blind, this panel checks the real precondition
// up front (reusing F6's `useBusinessAnalysis` hook directly, the same
// cross-feature hook-layer reuse F6 itself established for F4's leads
// hooks) and links to Business Analysis instead of showing the button.
export function ThemeStatusPanel({ leadId, businessName }: ThemeStatusPanelProps) {
  const {
    data: businessAnalysis,
    isLoading: analysisLoading,
    error: analysisError,
    refetch: refetchAnalysis,
  } = useBusinessAnalysis(leadId);
  const {
    data: themeConfig,
    isLoading: themeLoading,
    error: themeError,
    refetch: refetchTheme,
  } = useThemeConfiguration(leadId);

  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-h2 text-(--color-text-primary) font-semibold">{businessName}</h2>

      {analysisLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : analysisError ? (
        <ErrorState error={analysisError} onRetry={() => void refetchAnalysis()} />
      ) : !businessAnalysis || businessAnalysis.status !== 'completed' ? (
        <div className="flex flex-col gap-2">
          <p className="text-(--color-text-secondary) text-sm">
            Theme selection needs a completed business analysis first — none exists yet for this
            lead.
          </p>
          <Link
            href={`/business-analysis?leadId=${leadId}`}
            className="text-(--color-accent) self-start text-sm font-medium hover:underline"
          >
            Run Business Analysis
          </Link>
        </div>
      ) : themeLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : themeError ? (
        <ErrorState error={themeError} onRetry={() => void refetchTheme()} />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-(--color-text-secondary) text-sm">
              {themeConfig
                ? 'A theme has been selected for this lead.'
                : 'No theme has been selected for this lead yet.'}
            </p>
            <SelectThemeButton leadId={leadId} hasExistingTheme={!!themeConfig} />
          </div>
          {themeConfig ? (
            <>
              <div className="text-(--color-text-secondary) flex flex-wrap gap-4 text-sm">
                <span>
                  Selected Theme{' '}
                  <span className="text-(--color-text-primary)">{themeConfig.themeName}</span>
                </span>
                <span>
                  Compatibility Score{' '}
                  <span className="text-(--color-text-primary)">
                    {themeConfig.compatibilityScore.toFixed(0)}/100
                  </span>
                </span>
                <span>
                  Theme Version{' '}
                  <span className="text-(--color-text-primary)">{themeConfig.themeVersion}</span>
                </span>
                <span>
                  Engine Version{' '}
                  <span className="text-(--color-text-primary)">
                    {themeConfig.selectedByEngineVersion}
                  </span>
                </span>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/theme-engine/${leadId}`}
                  className="text-(--color-accent) text-sm font-medium hover:underline"
                >
                  View full details
                </Link>
                <Link
                  href={`/theme-engine/${leadId}/configuration`}
                  className="text-(--color-accent) text-sm font-medium hover:underline"
                >
                  View configuration
                </Link>
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
