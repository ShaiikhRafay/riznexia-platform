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
import { generateComponentManifest, generateLayout } from '@riznexia/website-generator';
import {
  BusinessNotFoundException,
  ComponentManifestNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import type { BusinessService } from '../business/business.service';
import type { LeadsService } from '../leads/leads.service';
import { ContentBindingService } from './content-binding.service';

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

// Real generateLayout()/generateComponentManifest() output, wrapped in row
// shape — same technique layout-generation/component-generation specs use,
// so content-binding tests exercise realistic upstream data rather than a
// hand-authored components array.
function buildLayoutAndComponentRows() {
  const brandBrief = fakeBrandBrief();
  const themeApiShape = {
    ...fakeThemeConfigRow(),
    navigationStyle: 'top-bar-sticky' as const,
    heroStyle: 'full-bleed-image' as const,
    ctaStyle: 'solid-button' as const,
    cardStyle: 'image-overlay' as const,
    footerStyle: 'multi-column' as const,
    animationLevel: 'moderate' as const,
    imageStyle: 'photography-realistic' as const,
    selectedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const layoutContent = generateLayout(brandBrief, themeApiShape as never);
  const layoutRow = {
    id: 'layout-config-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    configVersion: 1,
    createdAt: new Date(),
    ...layoutContent,
  };
  const layoutApiShape = { ...layoutRow, createdAt: layoutRow.createdAt.toISOString() };
  const componentContent = generateComponentManifest(
    brandBrief,
    themeApiShape as never,
    layoutApiShape as never,
  );
  const componentRow = {
    id: 'component-manifest-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    configVersion: 1,
    createdAt: new Date(),
    ...componentContent,
  };
  return { layoutRow, componentRow };
}

function fakeBusinessRow(overrides: Record<string, unknown> = {}) {
  return {
    businessName: "Joe's Diner",
    address: '123 Main St',
    city: 'Karachi',
    phone: '+92 300 1234567',
    photos: [{ name: 'photo-ref-1' }],
    openingHours: { weekdayText: ['Mon-Sun: 9:00 AM - 11:00 PM'] },
    rating: 4.5,
    reviewCount: 120,
    googleBusinessUrl: 'https://maps.google.com/?cid=12345',
    latitude: 24.8607,
    longitude: 67.0011,
    ...overrides,
  };
}

function fakeContentManifestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'content-manifest-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    componentManifestId: 'component-manifest-1',
    configVersion: 1,
    contentEngineVersion: 'v1.0',
    componentContent: [],
    unresolvedBindings: [],
    seoMetadata: {
      keywords: { value: ['diner near me'], source: 'BusinessAnalysis.brandBrief.seoKeywords' },
      localSeoSuggestions: { value: [], source: 'BusinessAnalysis.brandBrief.localSeoSuggestions' },
      metaTitle: { value: "Joe's Diner | Italian Restaurant in Karachi", source: 'x' },
      metaDescription: { value: 'A family-owned diner.', source: 'x' },
    },
    structuredData: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ContentBindingService', () => {
  let prisma: {
    componentManifest: { findFirst: jest.Mock };
    contentManifest: { findFirst: jest.Mock };
    themeConfiguration: { findUniqueOrThrow: jest.Mock };
    layoutConfiguration: { findUniqueOrThrow: jest.Mock };
    businessAnalysis: { findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };
  let leadsService: { findById: jest.Mock };
  let businessService: { findById: jest.Mock };
  let service: ContentBindingService;

  beforeEach(() => {
    prisma = {
      componentManifest: { findFirst: jest.fn() },
      contentManifest: { findFirst: jest.fn() },
      themeConfiguration: { findUniqueOrThrow: jest.fn() },
      layoutConfiguration: { findUniqueOrThrow: jest.fn() },
      businessAnalysis: { findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          contentManifest: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(fakeContentManifestRow()),
          },
        }),
      ),
    };
    leadsService = { findById: jest.fn().mockResolvedValue(fakeLead()) };
    businessService = { findById: jest.fn().mockResolvedValue(fakeBusinessRow()) };

    service = new ContentBindingService(
      prisma as unknown as PrismaClient,
      leadsService as unknown as LeadsService,
      businessService as unknown as BusinessService,
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
      prisma.contentManifest.findFirst.mockResolvedValue(null);
      expect(await service.findLatestForLead('lead-1')).toBeNull();
    });

    it('returns the latest manifest, mapped to the API shape', async () => {
      prisma.contentManifest.findFirst.mockResolvedValue(fakeContentManifestRow());
      const result = await service.findLatestForLead('lead-1');
      expect(result).toMatchObject({ id: 'content-manifest-1', contentEngineVersion: 'v1.0' });
    });
  });

  describe('bindContentForLead', () => {
    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.bindContentForLead('missing')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('throws ComponentManifestNotFoundException when no component manifest exists yet', async () => {
      prisma.componentManifest.findFirst.mockResolvedValue(null);
      await expect(service.bindContentForLead('lead-1')).rejects.toBeInstanceOf(
        ComponentManifestNotFoundException,
      );
    });

    it('returns cacheHit:true when a manifest already exists for this componentManifestId', async () => {
      const { componentRow } = buildLayoutAndComponentRows();
      prisma.componentManifest.findFirst.mockResolvedValue(componentRow);
      prisma.contentManifest.findFirst.mockResolvedValue(fakeContentManifestRow());

      const result = await service.bindContentForLead('lead-1');

      expect(result.cacheHit).toBe(true);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.themeConfiguration.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(businessService.findById).not.toHaveBeenCalled();
    });

    it('throws BusinessNotFoundException when the business record is missing', async () => {
      const { layoutRow, componentRow } = buildLayoutAndComponentRows();
      prisma.componentManifest.findFirst.mockResolvedValue(componentRow);
      prisma.contentManifest.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(fakeThemeConfigRow());
      prisma.layoutConfiguration.findUniqueOrThrow.mockResolvedValue(layoutRow);
      prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakeAnalysisRow());
      businessService.findById.mockResolvedValue(null);

      await expect(service.bindContentForLead('lead-1')).rejects.toBeInstanceOf(
        BusinessNotFoundException,
      );
    });

    it('binds and persists a new manifest on a cache miss, using real deterministic binding', async () => {
      const { layoutRow, componentRow } = buildLayoutAndComponentRows();
      prisma.componentManifest.findFirst.mockResolvedValue(componentRow);
      prisma.contentManifest.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(fakeThemeConfigRow());
      prisma.layoutConfiguration.findUniqueOrThrow.mockResolvedValue(layoutRow);
      prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakeAnalysisRow());
      const txCreate = jest.fn().mockResolvedValue(fakeContentManifestRow());
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          contentManifest: { findFirst: jest.fn().mockResolvedValue(null), create: txCreate },
        }),
      );

      const result = await service.bindContentForLead('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: 'business-1',
            businessAnalysisId: 'analysis-1',
            themeConfigurationId: 'theme-config-1',
            layoutConfigurationId: 'layout-config-1',
            componentManifestId: 'component-manifest-1',
            configVersion: 1,
            contentEngineVersion: 'v1.0',
          }),
        }),
      );
      const data = txCreate.mock.calls[0][0].data;
      const heroBinding = data.componentContent.find(
        (c: { componentId: string }) => c.componentId === 'hero-banner',
      );
      expect(
        heroBinding.fields.find((f: { slotName: string }) => f.slotName === 'headline').value,
      ).toEqual({
        value: 'Family recipes since 1985',
        source: 'BusinessAnalysis.brandBrief.uniqueSellingPoints[0]',
      });
      expect(data.seoMetadata.metaTitle.value).toBe("Joe's Diner | Italian Restaurant in Karachi");
    });

    it('allocates configVersion as max+1 within the transaction', async () => {
      const { layoutRow, componentRow } = buildLayoutAndComponentRows();
      prisma.componentManifest.findFirst.mockResolvedValue(componentRow);
      prisma.contentManifest.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(fakeThemeConfigRow());
      prisma.layoutConfiguration.findUniqueOrThrow.mockResolvedValue(layoutRow);
      prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakeAnalysisRow());
      const txCreate = jest.fn().mockResolvedValue(fakeContentManifestRow({ configVersion: 3 }));
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          contentManifest: {
            findFirst: jest.fn().mockResolvedValue({ configVersion: 2 }),
            create: txCreate,
          },
        }),
      );

      await service.bindContentForLead('lead-1');

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ configVersion: 3 }) }),
      );
    });
  });
});
