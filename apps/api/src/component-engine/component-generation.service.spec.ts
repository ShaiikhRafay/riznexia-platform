import {
  AnalysisStatus as PrismaAnalysisStatus,
  AnimationLevel,
  CardStyle,
  CtaStyle,
  FooterStyle,
  HeroStyle,
  ImageStyle,
  NavigationStyle,
} from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { Lead } from '@riznexia/shared-types';
import {
  LayoutConfigurationNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import type { LeadsService } from '../leads/leads.service';
import { ComponentGenerationService } from './component-generation.service';

function fakeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    businessId: 'business-1',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    websiteStatus: 'none',
    pipelineStage: 'new',
    assignedTo: null,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function fakeBrandBrief(overrides: Record<string, unknown> = {}) {
  return {
    businessSummary: 'A family-owned diner.',
    industry: 'Italian Restaurant',
    targetAudience: ['Local families'],
    brandPersonality: ['Warm'],
    toneOfVoice: 'Friendly',
    primaryServices: ['Dine-in'],
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
    websiteSections: ['Hero', 'Menu', 'Contact'],
    seoKeywords: ['diner near me'],
    localSeoSuggestions: [],
    ctaRecommendations: ['Order Online'],
    trustSignals: [],
    socialProofSuggestions: ['200+ five-star reviews'],
    imageRecommendations: [],
    contentRecommendations: ['Highlight family history'],
    ...overrides,
  };
}

function fakeAnalysisRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'analysis-1',
    businessId: 'business-1',
    analysisVersion: 1,
    status: PrismaAnalysisStatus.COMPLETED,
    brandBrief: fakeBrandBrief(),
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
    selectedAt: new Date(),
    selectedByEngineVersion: 'v1.0',
    compatibilityScore: 95,
    industry: 'Italian Restaurant',
    layoutStyle: 'Warm and inviting, image-forward',
    colorPalette: fakeBrandBrief().colorPalette,
    typography: fakeBrandBrief().typography,
    componentSet: ['hero-banner', 'menu-showcase'],
    navigationStyle: NavigationStyle.TOP_BAR_STICKY,
    heroStyle: HeroStyle.FULL_BLEED_IMAGE,
    ctaStyle: CtaStyle.SOLID_BUTTON,
    cardStyle: CardStyle.IMAGE_OVERLAY,
    footerStyle: FooterStyle.MULTI_COLUMN,
    animationLevel: AnimationLevel.MODERATE,
    imageStyle: ImageStyle.PHOTOGRAPHY_REALISTIC,
    sectionOrder: ['hero', 'menu', 'contact', 'footer'],
    accessibilityProfile: {
      contrastLevel: 'AA',
      minTouchTargetPx: 44,
      reducedMotionSupport: true,
      altTextRequired: true,
    },
    mobilePreferences: { navigationPattern: 'hamburger', stackedLayout: true, tapTargetSizePx: 48 },
    sectionComponentMap: {
      hero: ['hero-banner'],
      menu: ['menu-showcase'],
      contact: [],
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
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeLayoutConfigRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'layout-config-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    configVersion: 1,
    layoutEngineVersion: 'v1.0',
    pageStructure: [
      { sectionId: 'hero', order: 1, layoutType: 'full-width' },
      { sectionId: 'menu', order: 2, layoutType: 'grid' },
      { sectionId: 'contact', order: 3, layoutType: 'contained' },
      { sectionId: 'footer', order: 4, layoutType: 'contained' },
    ],
    navigation: {
      style: 'top-bar-sticky',
      position: 'top',
      sticky: true,
      items: ['menu', 'contact'],
      mobileBehavior: 'hamburger',
    },
    hero: {
      style: 'full-bleed-image',
      mediaPosition: 'background',
      contentAlignment: 'center',
      ctaSlots: 1,
    },
    footer: {
      style: 'multi-column',
      columns: 4,
      includesNewsletter: false,
      includesSocialLinks: true,
    },
    sidebar: null,
    grid: [{ sectionId: 'menu', columns: { mobile: 1, tablet: 2, desktop: 3 }, gap: 'standard' }],
    responsiveRules: {
      breakpoints: { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 },
      stackedLayout: true,
      tapTargetSizePx: 48,
      perSection: { hero: 'reflow', menu: 'stack', contact: 'reflow', footer: 'reflow' },
    },
    ctaPlacements: [{ ctaText: 'Order Online', zone: 'hero', style: 'solid-button' }],
    componentPlaceholders: [{ componentId: 'menu-showcase', sectionId: 'menu', order: 0 }],
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeComponentManifestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'manifest-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    configVersion: 1,
    componentEngineVersion: 'v1.0',
    themeTokens: {
      primary: '#8B4513',
      secondary: '#F5DEB3',
      accent: '#FF6347',
      background: '#FFF8DC',
      text: '#2F1B0C',
      heading: 'Georgia',
      body: 'Helvetica',
      radius: { small: '4px', medium: '8px', large: '16px', full: '9999px' },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
      shadow: 'subtle',
      button: 'solid-button',
      card: 'image-overlay',
      animation: 'moderate',
    },
    components: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ComponentGenerationService', () => {
  let prisma: {
    layoutConfiguration: { findFirst: jest.Mock };
    componentManifest: { findFirst: jest.Mock };
    themeConfiguration: { findUniqueOrThrow: jest.Mock };
    businessAnalysis: { findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };
  let leadsService: { findById: jest.Mock };
  let service: ComponentGenerationService;

  beforeEach(() => {
    prisma = {
      layoutConfiguration: { findFirst: jest.fn() },
      componentManifest: { findFirst: jest.fn() },
      themeConfiguration: { findUniqueOrThrow: jest.fn() },
      businessAnalysis: { findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          componentManifest: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(fakeComponentManifestRow()),
          },
        }),
      ),
    };
    leadsService = { findById: jest.fn().mockResolvedValue(fakeLead()) };

    service = new ComponentGenerationService(
      prisma as unknown as PrismaClient,
      leadsService as unknown as LeadsService,
    );
  });

  describe('findLatestForLead', () => {
    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.findLatestForLead('missing')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('returns null when no manifest exists yet', async () => {
      prisma.componentManifest.findFirst.mockResolvedValue(null);
      expect(await service.findLatestForLead('lead-1')).toBeNull();
    });

    it('returns the latest manifest, mapped to the API shape', async () => {
      prisma.componentManifest.findFirst.mockResolvedValue(fakeComponentManifestRow());
      const result = await service.findLatestForLead('lead-1');
      expect(result).toMatchObject({ id: 'manifest-1', componentEngineVersion: 'v1.0' });
    });
  });

  describe('generateComponentManifestForLead', () => {
    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.generateComponentManifestForLead('missing')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('throws LayoutConfigurationNotFoundException when no layout configuration exists yet', async () => {
      prisma.layoutConfiguration.findFirst.mockResolvedValue(null);
      await expect(service.generateComponentManifestForLead('lead-1')).rejects.toBeInstanceOf(
        LayoutConfigurationNotFoundException,
      );
    });

    it('returns cacheHit:true when a manifest already exists for this layoutConfigurationId', async () => {
      prisma.layoutConfiguration.findFirst.mockResolvedValue(fakeLayoutConfigRow());
      prisma.componentManifest.findFirst.mockResolvedValue(fakeComponentManifestRow());

      const result = await service.generateComponentManifestForLead('lead-1');

      expect(result.cacheHit).toBe(true);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.themeConfiguration.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prisma.businessAnalysis.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('generates and persists a new manifest on a cache miss, using real deterministic generation', async () => {
      prisma.layoutConfiguration.findFirst.mockResolvedValue(fakeLayoutConfigRow());
      prisma.componentManifest.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(fakeThemeConfigRow());
      prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakeAnalysisRow());
      const txCreate = jest.fn().mockResolvedValue(fakeComponentManifestRow());
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          componentManifest: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: txCreate,
          },
        }),
      );

      const result = await service.generateComponentManifestForLead('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: 'business-1',
            businessAnalysisId: 'analysis-1',
            themeConfigurationId: 'theme-config-1',
            layoutConfigurationId: 'layout-config-1',
            configVersion: 1,
            componentEngineVersion: 'v1.0',
          }),
        }),
      );
      // Real generateComponentManifest() output.
      const data = txCreate.mock.calls[0][0].data;
      const navComponent = data.components.find(
        (c: { componentType: string }) => c.componentType === 'navigation',
      );
      expect(navComponent).toBeDefined();
      const menuComponent = data.components.find(
        (c: { componentId: string }) => c.componentId === 'menu-showcase',
      );
      expect(menuComponent).toMatchObject({
        componentType: 'menu-list',
        parentComponentId: 'section-menu',
      });
    });

    it('allocates configVersion as max+1 within the transaction', async () => {
      prisma.layoutConfiguration.findFirst.mockResolvedValue(fakeLayoutConfigRow());
      prisma.componentManifest.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(fakeThemeConfigRow());
      prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakeAnalysisRow());
      const txCreate = jest.fn().mockResolvedValue(fakeComponentManifestRow({ configVersion: 3 }));
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          componentManifest: {
            findFirst: jest.fn().mockResolvedValue({ configVersion: 2 }),
            create: txCreate,
          },
        }),
      );

      await service.generateComponentManifestForLead('lead-1');

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ configVersion: 3 }) }),
      );
    });
  });
});
