import type {
  BusinessContactInfo,
  GeneratedWebsite,
  ThemeConfiguration,
} from '@riznexia/shared-types';
import {
  assembleWebsite,
  ASSEMBLY_ENGINE_VERSION,
  generateComponentManifest,
  generateContentManifest,
  generateLayout,
} from '@riznexia/website-generator';

// Shared test fixture for packages/website-preview's own tests — builds a
// full, realistic GeneratedWebsite by running the actual M8.1-M8.4
// generators (not a hand-rolled stub), same technique every M8.x
// package's own *-fixtures.ts already uses for its upstream inputs.
// Deliberately NOT exported from src/index.ts — this is test-only, same
// convention as website-generator's own component-fixtures.ts/
// content-fixtures.ts/assembly-fixtures.ts.
function fakeBrandBrief(overrides: Record<string, unknown> = {}) {
  return {
    businessSummary: 'A family-owned diner.',
    industry: 'Italian Restaurant',
    targetAudience: ['Local families'],
    brandPersonality: ['Warm'],
    toneOfVoice: 'Friendly',
    primaryServices: ['Dine-in', 'Takeout'],
    secondaryServices: [],
    uniqueSellingPoints: ['Family recipes since 1985'],
    colorPalette: {
      primary: '#8B4513',
      secondary: '#F5DEB3',
      accent: '#FF6347',
      background: '#FFF8DC',
      text: '#2F1B0C',
    },
    typography: { heading: 'Georgia', body: 'Helvetica', accent: 'Pacifico' },
    layoutStyle: 'Warm and inviting, image-forward',
    websiteSections: ['Hero', 'Menu', 'Gallery', 'Contact'],
    seoKeywords: ['diner near me'],
    localSeoSuggestions: [],
    ctaRecommendations: ['Order Online', 'Reserve a Table'],
    trustSignals: ['200+ five-star reviews'],
    socialProofSuggestions: ['200+ five-star reviews'],
    imageRecommendations: [],
    contentRecommendations: ['Highlight family history'],
    ...overrides,
  };
}

function fakeThemeConfigRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'theme-config-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    configVersion: 1,
    themeId: 'restaurant',
    themeName: 'Restaurant',
    themeVersion: 'v1.0',
    themeHash: 'hash-abc',
    selectedAt: new Date().toISOString(),
    selectedByEngineVersion: 'v1.0',
    compatibilityScore: 95,
    industry: 'Italian Restaurant',
    layoutStyle: 'Warm and inviting, image-forward',
    colorPalette: fakeBrandBrief().colorPalette,
    typography: fakeBrandBrief().typography,
    componentSet: [
      'hero-banner',
      'menu-showcase',
      'gallery-grid',
      'testimonial-carousel',
      'reservation-cta',
      'map-embed',
    ],
    navigationStyle: 'top-bar-sticky',
    heroStyle: 'full-bleed-image',
    ctaStyle: 'solid-button',
    cardStyle: 'image-overlay',
    footerStyle: 'multi-column',
    animationLevel: 'moderate',
    imageStyle: 'photography-realistic',
    sectionOrder: [
      'hero',
      'about',
      'menu',
      'gallery',
      'testimonials',
      'reservation-cta',
      'contact',
      'footer',
    ],
    accessibilityProfile: {
      contrastLevel: 'AA',
      minTouchTargetPx: 44,
      reducedMotionSupport: true,
      altTextRequired: true,
    },
    mobilePreferences: { navigationPattern: 'hamburger', stackedLayout: true, tapTargetSizePx: 48 },
    sectionComponentMap: {
      hero: ['hero-banner'],
      about: [],
      menu: ['menu-showcase'],
      gallery: ['gallery-grid'],
      testimonials: ['testimonial-carousel'],
      'reservation-cta': ['reservation-cta'],
      contact: ['map-embed'],
      footer: [],
    },
    rankedThemes: [],
    aiRecommendationProvider: null,
    aiRecommendationModel: null,
    aiRecommendationPromptTokens: null,
    aiRecommendationCompletionTokens: null,
    aiRecommendationTotalTokens: null,
    aiRecommendationCostUsd: null,
    aiRecommendationExecutionTimeMs: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function fakeBusinessContactInfo(
  overrides: Partial<BusinessContactInfo> = {},
): BusinessContactInfo {
  return {
    businessName: "Joe's Diner",
    address: '123 Main St',
    city: 'Karachi',
    phone: '+92 300 1234567',
    photos: [{ photoReference: 'photo-ref-1' }],
    openingHours: { weekdayText: ['Mon-Sun: 9:00 AM - 11:00 PM'] },
    rating: 4.5,
    reviewCount: 120,
    googleBusinessUrl: 'https://maps.google.com/?cid=12345',
    latitude: 24.8607,
    longitude: 67.0011,
    ...overrides,
  };
}

export interface FakeWebsitePreviewFixture {
  brandBrief: ReturnType<typeof fakeBrandBrief>;
  themeConfiguration: ThemeConfiguration;
  generatedWebsite: GeneratedWebsite;
}

/** Builds a full, realistic GeneratedWebsite by running the real M8.1-M8.4 pipeline end to end, wrapped in shared-types API shape. */
export function fakeWebsitePreviewFixture(
  overrides: { brandBriefOverrides?: Record<string, unknown> } = {},
): FakeWebsitePreviewFixture {
  const brandBrief = fakeBrandBrief(overrides.brandBriefOverrides);
  const themeConfiguration = fakeThemeConfigRow() as unknown as ThemeConfiguration;

  const layoutContent = generateLayout(brandBrief, themeConfiguration as never);
  const layoutConfiguration = {
    id: 'layout-config-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    configVersion: 1,
    createdAt: new Date().toISOString(),
    ...layoutContent,
  };

  const componentContent = generateComponentManifest(
    brandBrief,
    themeConfiguration as never,
    layoutConfiguration as never,
  );
  const componentManifest = {
    id: 'component-manifest-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    configVersion: 1,
    createdAt: new Date().toISOString(),
    ...componentContent,
  };

  const contentContent = generateContentManifest(
    brandBrief,
    fakeBusinessContactInfo(),
    themeConfiguration as never,
    layoutConfiguration as never,
    componentManifest as never,
  );
  const contentManifest = {
    id: 'content-manifest-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    componentManifestId: 'component-manifest-1',
    configVersion: 1,
    createdAt: new Date().toISOString(),
    ...contentContent,
  };

  const files = assembleWebsite({
    themeConfiguration: themeConfiguration as never,
    layoutConfiguration: layoutConfiguration as never,
    componentManifest: componentManifest as never,
    contentManifest: contentManifest as never,
  });

  const generatedWebsite: GeneratedWebsite = {
    id: 'generated-website-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    componentManifestId: 'component-manifest-1',
    contentManifestId: 'content-manifest-1',
    configVersion: 1,
    assemblyEngineVersion: ASSEMBLY_ENGINE_VERSION,
    files,
    createdAt: new Date().toISOString(),
  };

  return { brandBrief, themeConfiguration, generatedWebsite };
}
