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
  assembleWebsite,
  generateComponentManifest,
  generateContentManifest,
  generateLayout,
} from '@riznexia/website-generator';
import {
  GeneratedWebsiteNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import type { LeadsService } from '../leads/leads.service';
import { WebsitePreviewService } from './website-preview.service';

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

// Real generateLayout()/generateComponentManifest()/generateContentManifest()/
// assembleWebsite() output, wrapped in row shape — same technique
// website-assembly.service.spec.ts uses, so these tests exercise a
// realistic GeneratedWebsite rather than a hand-authored files[] stub.
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

  const businessContactInfo = {
    businessName: "Joe's Diner",
    address: '123 Main St',
    city: 'Karachi',
    phone: '+92 300 1234567',
    photos: [{ photoReference: 'photo-ref-1' }],
    openingHours: null,
    rating: 4.5,
    reviewCount: 120,
    googleBusinessUrl: 'https://maps.google.com/?cid=12345',
    latitude: 24.8607,
    longitude: 67.0011,
  };
  const contentContent = generateContentManifest(
    brandBrief,
    businessContactInfo,
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
  const contentApiShape = { ...contentRow, createdAt: contentRow.createdAt.toISOString() };

  const files = assembleWebsite({
    themeConfiguration: themeApiShape as never,
    layoutConfiguration: layoutApiShape as never,
    componentManifest: componentApiShape as never,
    contentManifest: contentApiShape as never,
  });

  const generatedWebsiteRow = {
    id: 'generated-website-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    themeConfigurationId: 'theme-config-1',
    layoutConfigurationId: 'layout-config-1',
    componentManifestId: 'component-manifest-1',
    contentManifestId: 'content-manifest-1',
    configVersion: 1,
    assemblyEngineVersion: 'v1.0',
    files,
    createdAt: new Date(),
  };

  return { themeRow, generatedWebsiteRow };
}

function fakeWebsitePreviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'website-preview-1',
    businessId: 'business-1',
    generatedWebsiteId: 'generated-website-1',
    previewVersion: 1,
    generatedWebsiteVersion: 1,
    validationVersion: 'v1.0',
    generatedByModuleVersion: 'v1.0',
    businessName: "Joe's Diner",
    themeName: 'Restaurant',
    themeId: 'restaurant',
    devicePresets: [{ mode: 'desktop', widthPx: 1440 }],
    files: [{ path: 'package.json', sizeBytes: 100 }],
    createdAt: new Date(),
    ...overrides,
  };
}

function fakePreviewReportRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'preview-report-1',
    businessId: 'business-1',
    generatedWebsiteId: 'generated-website-1',
    previewVersion: 1,
    generatedWebsiteVersion: 1,
    validationVersion: 'v1.0',
    generatedByModuleVersion: 'v1.0',
    rules: [],
    validationTimestamp: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeReadinessReportRow(overrides: Record<string, unknown> = {}) {
  const perfectScore = { score: 100, maxScore: 100, deductions: [] };
  return {
    id: 'readiness-report-1',
    businessId: 'business-1',
    generatedWebsiteId: 'generated-website-1',
    previewVersion: 1,
    generatedWebsiteVersion: 1,
    validationVersion: 'v1.0',
    generatedByModuleVersion: 'v1.0',
    seoScore: perfectScore,
    accessibilityScore: perfectScore,
    performanceScore: perfectScore,
    contentCompletenessScore: perfectScore,
    structuralIntegrityScore: perfectScore,
    overallPublishScore: perfectScore,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('WebsitePreviewService', () => {
  let prisma: {
    generatedWebsite: { findFirst: jest.Mock };
    websitePreview: { findFirst: jest.Mock };
    previewReport: { findFirst: jest.Mock };
    publishReadinessReport: { findFirst: jest.Mock };
    themeConfiguration: { findUniqueOrThrow: jest.Mock };
    businessAnalysis: { findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };
  let leadsService: { findById: jest.Mock };
  let service: WebsitePreviewService;

  beforeEach(() => {
    prisma = {
      generatedWebsite: { findFirst: jest.fn() },
      websitePreview: { findFirst: jest.fn() },
      previewReport: { findFirst: jest.fn() },
      publishReadinessReport: { findFirst: jest.fn() },
      themeConfiguration: { findUniqueOrThrow: jest.fn() },
      businessAnalysis: { findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          websitePreview: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(fakeWebsitePreviewRow()),
          },
          previewReport: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(fakePreviewReportRow()),
          },
          publishReadinessReport: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(fakeReadinessReportRow()),
          },
        }),
      ),
    };
    leadsService = { findById: jest.fn().mockResolvedValue(fakeLead()) };
    service = new WebsitePreviewService(
      prisma as unknown as PrismaClient,
      leadsService as unknown as LeadsService,
    );
  });

  describe('getPreview', () => {
    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.getPreview('missing')).rejects.toBeInstanceOf(LeadNotFoundException);
    });

    it('throws GeneratedWebsiteNotFoundException when no generated website exists yet', async () => {
      prisma.generatedWebsite.findFirst.mockResolvedValue(null);
      await expect(service.getPreview('lead-1')).rejects.toBeInstanceOf(
        GeneratedWebsiteNotFoundException,
      );
    });

    it('returns the cached preview when its generatedWebsiteVersion matches the current GeneratedWebsite (Decision 2)', async () => {
      const { generatedWebsiteRow } = buildRows();
      prisma.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
      prisma.websitePreview.findFirst.mockResolvedValue(
        fakeWebsitePreviewRow({ generatedWebsiteVersion: generatedWebsiteRow.configVersion }),
      );

      const result = await service.getPreview('lead-1');

      expect(result.id).toBe('website-preview-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.themeConfiguration.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('regenerates when the cached previewVersion is stale relative to GeneratedWebsite.configVersion', async () => {
      const { themeRow, generatedWebsiteRow } = buildRows();
      const newer = { ...generatedWebsiteRow, configVersion: 2 };
      prisma.generatedWebsite.findFirst.mockResolvedValue(newer);
      prisma.websitePreview.findFirst.mockResolvedValue(
        fakeWebsitePreviewRow({ generatedWebsiteVersion: 1 }),
      );
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeRow);
      const txCreate = jest
        .fn()
        .mockResolvedValue(
          fakeWebsitePreviewRow({ generatedWebsiteVersion: 2, previewVersion: 2 }),
        );
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          websitePreview: {
            findFirst: jest.fn().mockResolvedValue({ previewVersion: 1 }),
            create: txCreate,
          },
        }),
      );

      const result = await service.getPreview('lead-1');

      expect(result.generatedWebsiteVersion).toBe(2);
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessName: "Joe's Diner",
            themeName: 'Restaurant',
            previewVersion: 2,
          }),
        }),
      );
    });

    it('never mutates the underlying GeneratedWebsite row (Decision 1, read-only)', async () => {
      const { themeRow, generatedWebsiteRow } = buildRows();
      prisma.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
      prisma.websitePreview.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeRow);
      const before = JSON.stringify(generatedWebsiteRow.files);

      await service.getPreview('lead-1');

      expect(JSON.stringify(generatedWebsiteRow.files)).toBe(before);
      expect(Object.keys(prisma.generatedWebsite)).not.toContain('update');
    });
  });

  describe('getValidationReport', () => {
    it('throws GeneratedWebsiteNotFoundException when no generated website exists yet', async () => {
      prisma.generatedWebsite.findFirst.mockResolvedValue(null);
      await expect(service.getValidationReport('lead-1')).rejects.toBeInstanceOf(
        GeneratedWebsiteNotFoundException,
      );
    });

    it('returns the cached report when up to date', async () => {
      const { generatedWebsiteRow } = buildRows();
      prisma.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
      prisma.previewReport.findFirst.mockResolvedValue(
        fakePreviewReportRow({ generatedWebsiteVersion: generatedWebsiteRow.configVersion }),
      );

      const result = await service.getValidationReport('lead-1');

      expect(result.id).toBe('preview-report-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('runs the real validator registry and persists real rules on a cache miss', async () => {
      const { themeRow, generatedWebsiteRow } = buildRows();
      prisma.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
      prisma.previewReport.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeRow);
      prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakeAnalysisRow());
      const txCreate = jest.fn().mockResolvedValue(fakePreviewReportRow());
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          previewReport: { findFirst: jest.fn().mockResolvedValue(null), create: txCreate },
        }),
      );

      await service.getValidationReport('lead-1');

      const data = txCreate.mock.calls[0][0].data;
      expect(Array.isArray(data.rules)).toBe(true);
      expect(data.rules.length).toBeGreaterThan(10);
      expect(data.rules.some((r: { ruleCategory: string }) => r.ruleCategory === 'seo')).toBe(true);
    });
  });

  describe('getReadinessReport', () => {
    it('throws GeneratedWebsiteNotFoundException when no generated website exists yet', async () => {
      prisma.generatedWebsite.findFirst.mockResolvedValue(null);
      await expect(service.getReadinessReport('lead-1')).rejects.toBeInstanceOf(
        GeneratedWebsiteNotFoundException,
      );
    });

    it('returns the cached report when up to date', async () => {
      const { generatedWebsiteRow } = buildRows();
      prisma.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
      prisma.publishReadinessReport.findFirst.mockResolvedValue(
        fakeReadinessReportRow({ generatedWebsiteVersion: generatedWebsiteRow.configVersion }),
      );

      const result = await service.getReadinessReport('lead-1');

      expect(result.id).toBe('readiness-report-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('independently re-runs validators (Decision 1/3) and persists real, explained scores on a cache miss', async () => {
      const { themeRow, generatedWebsiteRow } = buildRows();
      prisma.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
      prisma.publishReadinessReport.findFirst.mockResolvedValue(null);
      prisma.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeRow);
      prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakeAnalysisRow());
      const txCreate = jest.fn().mockResolvedValue(fakeReadinessReportRow());
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          publishReadinessReport: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: txCreate,
          },
        }),
      );
      // getValidationReport was never called on this service instance —
      // proves getReadinessReport doesn't depend on a prior /validation call.
      expect(prisma.previewReport.findFirst).not.toHaveBeenCalled();

      await service.getReadinessReport('lead-1');

      const data = txCreate.mock.calls[0][0].data;
      expect(data.overallPublishScore.score).toBeGreaterThanOrEqual(0);
      expect(data.overallPublishScore.maxScore).toBe(100);
      expect(prisma.previewReport.findFirst).not.toHaveBeenCalled();
    });
  });
});
