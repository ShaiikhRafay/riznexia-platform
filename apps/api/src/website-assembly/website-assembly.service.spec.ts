import {
  AnimationLevel,
  CardStyle,
  CtaStyle,
  FooterStyle,
  HeroStyle,
  ImageStyle,
  NavigationStyle,
} from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { BusinessContactInfo, Lead } from '@riznexia/shared-types';
import {
  generateComponentManifest,
  generateContentManifest,
  generateLayout,
} from '@riznexia/website-generator';
import {
  ContentManifestNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import type { LeadsService } from '../leads/leads.service';
import { WebsiteAssemblyService } from './website-assembly.service';

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

// Real generateLayout()/generateComponentManifest()/generateContentManifest()
// output, wrapped in row shape — same technique content-binding.service.spec.ts
// uses, so these tests exercise a fully realistic ContentManifest (with
// real structuredData/componentContent) rather than a hand-authored stub
// assembleWebsite() would reject.
function buildRows() {
  const brandBrief = fakeBrandBrief();
  const themeRow = fakeThemeConfigRow();
  const themeApiShape = {
    ...themeRow,
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
  const componentApiShape = { ...componentRow, createdAt: componentRow.createdAt.toISOString() };

  const contentContent = generateContentManifest(
    brandBrief,
    fakeBusinessContactInfo(),
    themeApiShape as never,
    layoutApiShape as never,
    componentApiShape as never,
  );
  const contentRow = {
    id: 'content-manifest-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    componentManifestId: 'component-manifest-1',
    configVersion: 1,
    createdAt: new Date(),
    ...contentContent,
  };

  return { themeRow, layoutRow, componentRow, contentRow };
}

function fakeGeneratedWebsiteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'generated-website-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    componentManifestId: 'component-manifest-1',
    contentManifestId: 'content-manifest-1',
    configVersion: 1,
    assemblyEngineVersion: 'v1.0',
    files: [{ path: 'package.json', content: '{}' }],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('WebsiteAssemblyService', () => {
  let prisma: {
    contentManifest: { findFirst: jest.Mock };
    generatedWebsite: { findFirst: jest.Mock };
    themeConfiguration: { findUniqueOrThrow: jest.Mock };
    layoutConfiguration: { findUniqueOrThrow: jest.Mock };
    componentManifest: { findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };
  let leadsService: { findById: jest.Mock };
  let service: WebsiteAssemblyService;

  beforeEach(() => {
    prisma = {
      contentManifest: { findFirst: jest.fn() },
      generatedWebsite: { findFirst: jest.fn() },
      themeConfiguration: { findUniqueOrThrow: jest.fn() },
      layoutConfiguration: { findUniqueOrThrow: jest.fn() },
      componentManifest: { findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          generatedWebsite: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(fakeGeneratedWebsiteRow()),
          },
        }),
      ),
    };
    leadsService = { findById: jest.fn().mockResolvedValue(fakeLead()) };

    service = new WebsiteAssemblyService(
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

    it('returns null when no generated website exists yet', async () => {
      prisma.generatedWebsite.findFirst.mockResolvedValue(null);
      expect(await service.findLatestForLead('lead-1')).toBeNull();
    });

    it('returns the latest generated website, mapped to the API shape', async () => {
      prisma.generatedWebsite.findFirst.mockResolvedValue(fakeGeneratedWebsiteRow());
      const result = await service.findLatestForLead('lead-1');
      expect(result).toMatchObject({ id: 'generated-website-1', assemblyEngineVersion: 'v1.0' });
    });
  });

  describe('assembleWebsiteForLead', () => {
    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.assembleWebsiteForLead('missing')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('throws ContentManifestNotFoundException when no content manifest exists yet', async () => {
      prisma.contentManifest.findFirst.mockResolvedValue(null);
      await expect(service.assembleWebsiteForLead('lead-1')).rejects.toBeInstanceOf(
        ContentManifestNotFoundException,
      );
    });

    it('returns cacheHit:true when a generated website already exists for this contentManifestId', async () => {
      const { contentRow } = buildRows();
      prisma.contentManifest.findFirst.mockResolvedValue(contentRow);
      prisma.generatedWebsite.findFirst.mockResolvedValue(fakeGeneratedWebsiteRow());

      const result = await service.assembleWebsiteForLead('lead-1');

      expect(result.cacheHit).toBe(true);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.themeConfiguration.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('assembles and persists a new website on a cache miss, using the real deterministic assembler', async () => {
      const { themeRow, layoutRow, componentRow, contentRow } = buildRows();
      prisma.contentManifest.findFirst.mockResolvedValue(contentRow);
      prisma.generatedWebsite.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeRow);
      prisma.layoutConfiguration.findUniqueOrThrow.mockResolvedValue(layoutRow);
      prisma.componentManifest.findUniqueOrThrow.mockResolvedValue(componentRow);
      const txCreate = jest.fn().mockResolvedValue(fakeGeneratedWebsiteRow());
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          generatedWebsite: { findFirst: jest.fn().mockResolvedValue(null), create: txCreate },
        }),
      );

      const result = await service.assembleWebsiteForLead('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: 'business-1',
            businessAnalysisId: 'analysis-1',
            themeConfigurationId: 'theme-config-1',
            layoutConfigurationId: 'layout-config-1',
            componentManifestId: 'component-manifest-1',
            contentManifestId: 'content-manifest-1',
            configVersion: 1,
            assemblyEngineVersion: 'v1.0',
          }),
        }),
      );

      const files = txCreate.mock.calls[0][0].data.files as { path: string; content: string }[];
      expect(files.some((f) => f.path === 'app/page.tsx')).toBe(true);
      expect(files.some((f) => f.path === 'lib/site-data.ts')).toBe(true);
      const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content);
      expect(pkg.name).toBe('joe-s-diner');
    });

    it('allocates configVersion as max+1 within the transaction', async () => {
      const { themeRow, layoutRow, componentRow, contentRow } = buildRows();
      prisma.contentManifest.findFirst.mockResolvedValue(contentRow);
      prisma.generatedWebsite.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeRow);
      prisma.layoutConfiguration.findUniqueOrThrow.mockResolvedValue(layoutRow);
      prisma.componentManifest.findUniqueOrThrow.mockResolvedValue(componentRow);
      const txCreate = jest.fn().mockResolvedValue(fakeGeneratedWebsiteRow({ configVersion: 3 }));
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          generatedWebsite: {
            findFirst: jest.fn().mockResolvedValue({ configVersion: 2 }),
            create: txCreate,
          },
        }),
      );

      await service.assembleWebsiteForLead('lead-1');

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ configVersion: 3 }) }),
      );
    });
  });
});
