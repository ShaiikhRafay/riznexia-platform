import { AiProviderName } from '@riznexia/db';
import type { ThemeConfiguration as ThemeConfigurationModel } from '@riznexia/db';
import type {
  AiProvider,
  ColorPalette,
  RankedThemeEntry,
  ThemeCategory,
  ThemeConfiguration as ThemeConfigurationResponse,
  TypographyRecommendation,
} from '@riznexia/shared-types';
import {
  toApiAnimationLevel,
  toApiCardStyle,
  toApiCtaStyle,
  toApiFooterStyle,
  toApiHeroStyle,
  toApiImageStyle,
  toApiNavigationStyle,
} from '../theme-style.mapper';

// Same Prisma-uppercase / API-lowercase split as
// business-analysis/dto/business-analysis-response.dto.ts's
// PRISMA_TO_API_PROVIDER — duplicated locally rather than imported since
// it's a small display-enum mapping, not cost-tracking logic (D-048 only
// requires reusing the latter, via ai-cost.util.ts).
const PRISMA_TO_API_PROVIDER: Record<AiProviderName, AiProvider> = {
  [AiProviderName.CLAUDE]: 'claude',
  [AiProviderName.OPENAI]: 'openai',
  [AiProviderName.GEMINI]: 'gemini',
  [AiProviderName.DEEPSEEK]: 'deepseek',
  [AiProviderName.LOCAL_LLM]: 'local_llm',
};

export function toThemeConfigurationResponse(
  config: ThemeConfigurationModel,
): ThemeConfigurationResponse {
  return {
    id: config.id,
    businessId: config.businessId,
    businessAnalysisId: config.businessAnalysisId,
    configVersion: config.configVersion,

    themeId: config.themeId as ThemeCategory,
    themeName: config.themeName,
    themeVersion: config.themeVersion,
    themeHash: config.themeHash,
    selectedAt: config.selectedAt.toISOString(),
    selectedByEngineVersion: config.selectedByEngineVersion,
    compatibilityScore: config.compatibilityScore,

    industry: config.industry,
    layoutStyle: config.layoutStyle,
    colorPalette: config.colorPalette as unknown as ColorPalette,
    typography: config.typography as unknown as TypographyRecommendation,

    componentSet: config.componentSet as unknown as string[],
    navigationStyle: toApiNavigationStyle(config.navigationStyle),
    heroStyle: toApiHeroStyle(config.heroStyle),
    ctaStyle: toApiCtaStyle(config.ctaStyle),
    cardStyle: toApiCardStyle(config.cardStyle),
    footerStyle: toApiFooterStyle(config.footerStyle),
    animationLevel: toApiAnimationLevel(config.animationLevel),
    imageStyle: toApiImageStyle(config.imageStyle),
    sectionOrder: config.sectionOrder as unknown as string[],
    accessibilityProfile:
      config.accessibilityProfile as unknown as ThemeConfigurationResponse['accessibilityProfile'],
    mobilePreferences:
      config.mobilePreferences as unknown as ThemeConfigurationResponse['mobilePreferences'],

    sectionComponentMap: config.sectionComponentMap as unknown as Record<string, string[]>,

    rankedThemes: config.rankedThemes as unknown as RankedThemeEntry[],

    aiRecommendationProvider:
      config.aiRecommendationProvider === null
        ? null
        : PRISMA_TO_API_PROVIDER[config.aiRecommendationProvider],
    aiRecommendationModel: config.aiRecommendationModel,
    aiRecommendationPromptTokens: config.aiRecommendationPromptTokens,
    aiRecommendationCompletionTokens: config.aiRecommendationCompletionTokens,
    aiRecommendationTotalTokens: config.aiRecommendationTotalTokens,
    aiRecommendationCostUsd:
      config.aiRecommendationCostUsd === null ? null : Number(config.aiRecommendationCostUsd),
    aiRecommendationExecutionTimeMs: config.aiRecommendationExecutionTimeMs,

    createdAt: config.createdAt.toISOString(),
  };
}
