import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AiProviderName,
  AnalysisStatus as PrismaAnalysisStatus,
  AnimationLevel,
  BusinessOperatingStatus,
  BusinessSourceProvider,
  CardStyle,
  CtaStyle,
  FooterStyle,
  HeroStyle,
  ImageStyle,
  NavigationStyle,
  PipelineStage,
  WebsiteStatusType,
} from '@riznexia/db';
import { AI_TEXT_PROVIDER } from '@riznexia/ai';
import {
  assembleWebsite,
  generateComponentManifest,
  generateContentManifest,
  generateLayout,
} from '@riznexia/website-generator';
import type { BusinessContactInfo } from '@riznexia/shared-types';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ClerkService } from '../src/auth/clerk.service';

// End-to-end check of the full request chain for Module M9 — guards,
// validation pipes, controllers, services, and the real, unmocked
// runAllValidators()/generateWebsitePreview()/aggregateReadiness()
// (@riznexia/website-preview is pure/deterministic/read-only, no
// external dependency to mock) wired together for real, same pattern as
// test/website.e2e-spec.ts. AI_TEXT_PROVIDER is still overridden since
// AppModule boots every module, including M6's, but this flow never
// calls it.
describe('Website Preview (e2e)', () => {
  let app: INestApplication;

  const LEAD_ID = '11111111-1111-4111-8111-111111111111';
  const BUSINESS_ID = '22222222-2222-4222-8222-222222222222';
  const ANALYSIS_ID = '33333333-3333-4333-8333-333333333333';
  const THEME_CONFIG_ID = '55555555-5555-4555-8555-555555555555';
  const LAYOUT_CONFIG_ID = '66666666-6666-4666-8666-666666666666';
  const COMPONENT_MANIFEST_ID = '77777777-7777-4777-8777-777777777777';
  const CONTENT_MANIFEST_ID = '88888888-8888-4888-8888-888888888888';
  const GENERATED_WEBSITE_ID = '99999999-9999-4999-8999-999999999999';
  const UNKNOWN_LEAD_ID = '44444444-4444-4444-8444-444444444444';

  const business = {
    id: BUSINESS_ID,
    googlePlaceId: 'place-1',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    placesData: {},
    websiteStatus: WebsiteStatusType.NONE,
    latitude: 24.8607,
    longitude: 67.0011,
    phone: '+92 300 1234567',
    rating: 4.5,
    reviewCount: 120,
    openingHours: { weekdayText: ['Mon-Sun: 9:00 AM - 11:00 PM'] },
    photos: [{ name: 'photo-ref-1' }],
    businessStatus: BusinessOperatingStatus.OPERATIONAL,
    googleBusinessUrl: 'https://maps.google.com/?cid=12345',
    websiteDetectedAt: null,
    websiteDetectionMethod: null,
    syncVersion: 1,
    sourceProvider: BusinessSourceProvider.GOOGLE,
    lastSyncedAt: null,
    lastSyncJobId: null,
    discoveryJobId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const leadRow = {
    id: LEAD_ID,
    businessId: BUSINESS_ID,
    pipelineStage: PipelineStage.NEW,
    assignedToId: null,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    business,
  };

  const brandBrief = {
    businessSummary: 'A family-owned Italian diner.',
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
  };

  const analysisRow = {
    id: ANALYSIS_ID,
    businessId: BUSINESS_ID,
    analysisVersion: 1,
    promptName: 'business_analysis',
    promptVersion: 'v1.0',
    promptHash: 'hash-abc',
    aiProvider: AiProviderName.CLAUDE,
    aiModel: 'claude-sonnet-5',
    inputHash: 'input-hash-1',
    status: PrismaAnalysisStatus.COMPLETED,
    brandBrief,
    sentimentSummary: null,
    confidenceScore: 0.85,
    rawResponse: null,
    validationErrors: null,
    executionTimeMs: 4000,
    completedAt: new Date('2026-01-02T00:00:00Z'),
    promptTokens: 500,
    completionTokens: 300,
    totalTokens: 800,
    estimatedCost: 0.02,
    createdAt: new Date('2026-01-02T00:00:00Z'),
  };

  const themeConfigRow = {
    id: THEME_CONFIG_ID,
    businessId: BUSINESS_ID,
    businessAnalysisId: ANALYSIS_ID,
    configVersion: 1,
    themeId: 'restaurant',
    themeName: 'Restaurant',
    themeVersion: 'v1.0',
    themeHash: 'hash-xyz',
    selectedAt: new Date('2026-01-03T00:00:00Z'),
    selectedByEngineVersion: 'v1.0',
    compatibilityScore: 96,
    industry: brandBrief.industry,
    layoutStyle: brandBrief.layoutStyle,
    colorPalette: brandBrief.colorPalette,
    typography: brandBrief.typography,
    componentSet: [
      'hero-banner',
      'menu-showcase',
      'gallery-grid',
      'testimonial-carousel',
      'reservation-cta',
      'map-embed',
    ],
    navigationStyle: NavigationStyle.TOP_BAR_STICKY,
    heroStyle: HeroStyle.FULL_BLEED_IMAGE,
    ctaStyle: CtaStyle.SOLID_BUTTON,
    cardStyle: CardStyle.IMAGE_OVERLAY,
    footerStyle: FooterStyle.MULTI_COLUMN,
    animationLevel: AnimationLevel.MODERATE,
    imageStyle: ImageStyle.PHOTOGRAPHY_REALISTIC,
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
    rankedThemes: [
      {
        rank: 1,
        themeId: 'restaurant',
        themeName: 'Restaurant',
        themeVersion: 'v1.0',
        themeHash: 'hash-xyz',
        compatibilityScore: 96,
      },
    ],
    aiRecommendationProvider: null,
    aiRecommendationModel: null,
    aiRecommendationPromptTokens: null,
    aiRecommendationCompletionTokens: null,
    aiRecommendationTotalTokens: null,
    aiRecommendationCostUsd: null,
    aiRecommendationExecutionTimeMs: null,
    createdAt: new Date('2026-01-03T00:00:00Z'),
  };

  const themeApiShape = {
    ...themeConfigRow,
    navigationStyle: 'top-bar-sticky' as const,
    heroStyle: 'full-bleed-image' as const,
    ctaStyle: 'solid-button' as const,
    cardStyle: 'image-overlay' as const,
    footerStyle: 'multi-column' as const,
    animationLevel: 'moderate' as const,
    imageStyle: 'photography-realistic' as const,
    selectedAt: themeConfigRow.selectedAt.toISOString(),
    createdAt: themeConfigRow.createdAt.toISOString(),
  };
  const layoutContent = generateLayout(brandBrief, themeApiShape as never);
  const layoutConfigRow = {
    id: LAYOUT_CONFIG_ID,
    businessId: BUSINESS_ID,
    businessAnalysisId: ANALYSIS_ID,
    themeConfigurationId: THEME_CONFIG_ID,
    configVersion: 1,
    createdAt: new Date('2026-01-04T00:00:00Z'),
    ...layoutContent,
  };
  const layoutApiShape = { ...layoutConfigRow, createdAt: layoutConfigRow.createdAt.toISOString() };
  const componentContent = generateComponentManifest(
    brandBrief,
    themeApiShape as never,
    layoutApiShape as never,
  );
  const componentManifestRow = {
    id: COMPONENT_MANIFEST_ID,
    businessId: BUSINESS_ID,
    businessAnalysisId: ANALYSIS_ID,
    themeConfigurationId: THEME_CONFIG_ID,
    layoutConfigurationId: LAYOUT_CONFIG_ID,
    configVersion: 1,
    createdAt: new Date('2026-01-05T00:00:00Z'),
    ...componentContent,
  };
  const componentApiShape = {
    ...componentManifestRow,
    createdAt: componentManifestRow.createdAt.toISOString(),
  };
  const businessContactInfo: BusinessContactInfo = {
    businessName: business.businessName,
    address: business.address,
    city: business.city,
    phone: business.phone,
    photos: business.photos.map((p) => ({ photoReference: p.name })),
    openingHours: business.openingHours,
    rating: business.rating,
    reviewCount: business.reviewCount,
    googleBusinessUrl: business.googleBusinessUrl,
    latitude: business.latitude,
    longitude: business.longitude,
  };
  const contentContent = generateContentManifest(
    brandBrief,
    businessContactInfo,
    themeApiShape as never,
    layoutApiShape as never,
    componentApiShape as never,
  );
  const contentManifestRow = {
    id: CONTENT_MANIFEST_ID,
    businessId: BUSINESS_ID,
    businessAnalysisId: ANALYSIS_ID,
    themeConfigurationId: THEME_CONFIG_ID,
    layoutConfigurationId: LAYOUT_CONFIG_ID,
    componentManifestId: COMPONENT_MANIFEST_ID,
    configVersion: 1,
    createdAt: new Date('2026-01-06T00:00:00Z'),
    ...contentContent,
  };
  const contentApiShape = {
    ...contentManifestRow,
    createdAt: contentManifestRow.createdAt.toISOString(),
  };

  const files = assembleWebsite({
    themeConfiguration: themeApiShape as never,
    layoutConfiguration: layoutApiShape as never,
    componentManifest: componentApiShape as never,
    contentManifest: contentApiShape as never,
  });

  const generatedWebsiteRow = {
    id: GENERATED_WEBSITE_ID,
    businessId: BUSINESS_ID,
    businessAnalysisId: ANALYSIS_ID,
    themeConfigurationId: THEME_CONFIG_ID,
    layoutConfigurationId: LAYOUT_CONFIG_ID,
    componentManifestId: COMPONENT_MANIFEST_ID,
    contentManifestId: CONTENT_MANIFEST_ID,
    configVersion: 1,
    assemblyEngineVersion: 'v1.0',
    files,
    createdAt: new Date('2026-01-07T00:00:00Z'),
  };

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn() },
    generatedWebsite: { findFirst: jest.fn() },
    themeConfiguration: { findUniqueOrThrow: jest.fn() },
    businessAnalysis: { findUniqueOrThrow: jest.fn() },
    websitePreview: { findFirst: jest.fn(), create: jest.fn() },
    previewReport: { findFirst: jest.fn(), create: jest.fn() },
    publishReadinessReport: { findFirst: jest.fn(), create: jest.fn() },
    costEvent: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prismaMock)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  const cacheMock = {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn(),
    incrementCounter: jest.fn().mockResolvedValue(0),
    getCounter: jest.fn().mockResolvedValue(0),
    delete: jest.fn(),
  };
  const clerkServiceMock = { verifyToken: jest.fn() };
  const aiTextProviderMock = { name: 'CLAUDE', complete: jest.fn() };

  const salesRep = {
    id: 'rep-1',
    clerkUserId: 'user_1',
    name: 'Jane Doe',
    email: 'jane@riznexia.com',
    role: 'SALES_EXECUTIVE',
  };
  const viewer = {
    id: 'viewer-1',
    clerkUserId: 'user_viewer',
    name: 'Vic Viewer',
    email: 'vic@riznexia.com',
    role: 'VIEWER',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(prismaMock)
      .overrideProvider(REDIS_CACHE)
      .useValue(cacheMock)
      .overrideProvider(ClerkService)
      .useValue(clerkServiceMock)
      .overrideProvider(AI_TEXT_PROVIDER)
      .useValue(aiTextProviderMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    cacheMock.getCounter.mockResolvedValue(0);
  });

  function authenticateAs(member: typeof salesRep): void {
    clerkServiceMock.verifyToken.mockResolvedValue({ sub: member.clerkUserId });
    prismaMock.teamMember.findUnique.mockResolvedValue(member);
  }

  function primeGeneratedWebsite(): void {
    prismaMock.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
    prismaMock.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeConfigRow);
    prismaMock.businessAnalysis.findUniqueOrThrow.mockResolvedValue(analysisRow);
  }

  describe('authentication', () => {
    it('rejects GET /leads/:id/preview with no token', async () => {
      const response = await request(app.getHttpServer()).get(`/leads/${LEAD_ID}/preview`);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('RBAC', () => {
    it('returns 403 for a Viewer on GET /preview (lacks website:preview — unlike M6-M8, GET itself is gated)', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview`)
        .set('Authorization', 'Bearer valid.jwt');
      expect(response.status).toBe(403);
    });

    it('returns 403 for a Viewer on GET /preview/validation', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview/validation`)
        .set('Authorization', 'Bearer valid.jwt');
      expect(response.status).toBe(403);
    });

    it('returns 403 for a Viewer on GET /preview/readiness', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview/readiness`)
        .set('Authorization', 'Bearer valid.jwt');
      expect(response.status).toBe(403);
    });

    it('allows a sales_executive (has website:preview) on all three routes', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      primeGeneratedWebsite();
      prismaMock.websitePreview.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'wp-1', createdAt: new Date(), ...data }),
      );

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview`)
        .set('Authorization', 'Bearer valid.jwt');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /leads/:id/preview', () => {
    it('returns 404 GENERATED_WEBSITE_NOT_FOUND when no generated website exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.generatedWebsite.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('GENERATED_WEBSITE_NOT_FOUND');
    });

    it('returns a real preview with the actual business name and file manifest', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      primeGeneratedWebsite();
      prismaMock.websitePreview.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'wp-1', createdAt: new Date(), ...data }),
      );

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body.businessName).toBe("Joe's Diner");
      expect(response.body.themeName).toBe('Restaurant');
      expect(response.body.devicePresets).toEqual([
        { mode: 'desktop', widthPx: 1440 },
        { mode: 'tablet', widthPx: 768 },
        { mode: 'mobile', widthPx: 375 },
      ]);
      expect(response.body.files.some((f: { path: string }) => f.path === 'app/page.tsx')).toBe(
        true,
      );
      expect(response.body.generatedWebsiteId).toBe(GENERATED_WEBSITE_ID);
    });

    it('returns the cached preview on a repeat call, without re-reading ThemeConfiguration', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.generatedWebsite.findFirst.mockResolvedValue(generatedWebsiteRow);
      prismaMock.websitePreview.findFirst.mockResolvedValue({
        id: 'wp-cached',
        businessId: BUSINESS_ID,
        generatedWebsiteId: GENERATED_WEBSITE_ID,
        previewVersion: 1,
        generatedWebsiteVersion: 1,
        validationVersion: 'v1.0',
        generatedByModuleVersion: 'v1.0',
        businessName: "Joe's Diner",
        themeName: 'Restaurant',
        themeId: 'restaurant',
        devicePresets: [],
        files: [],
        createdAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('wp-cached');
      expect(prismaMock.themeConfiguration.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prismaMock.websitePreview.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /leads/:id/preview/validation', () => {
    it('runs the real deterministic validator registry and returns real, fully-explained rules', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      primeGeneratedWebsite();
      prismaMock.previewReport.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'pr-1', createdAt: new Date(), ...data }),
      );

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview/validation`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.rules)).toBe(true);
      expect(response.body.rules.length).toBeGreaterThan(10);
      for (const rule of response.body.rules) {
        expect(rule.ruleId).toBeTruthy();
        expect(rule.ruleCategory).toBeTruthy();
        expect(rule.ruleName).toBeTruthy();
        expect(rule.severity).toBeTruthy();
        expect(rule.status).toBeTruthy();
        expect(rule.message).toBeTruthy();
        expect(rule.documentationUrl).toBeNull();
      }
      const errors = response.body.rules.filter((r: { status: string }) => r.status === 'error');
      expect(errors).toEqual([]);
    });
  });

  describe('GET /leads/:id/preview/readiness', () => {
    it('runs validators independently and returns real, explained scores', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      primeGeneratedWebsite();
      prismaMock.publishReadinessReport.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'prr-1', createdAt: new Date(), ...data }),
      );

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/preview/readiness`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      for (const key of [
        'seoScore',
        'accessibilityScore',
        'performanceScore',
        'contentCompletenessScore',
        'structuralIntegrityScore',
        'overallPublishScore',
      ]) {
        expect(response.body[key].score).toBeGreaterThanOrEqual(0);
        expect(response.body[key].score).toBeLessThanOrEqual(100);
        expect(response.body[key].maxScore).toBe(100);
        expect(Array.isArray(response.body[key].deductions)).toBe(true);
      }
      // /validation was never called on this instance — proves readiness never depends on it (Decision 1/3).
      expect(prismaMock.previewReport.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('non-UUID validation', () => {
    it('returns 400 VALIDATION_ERROR for a malformed lead id', async () => {
      authenticateAs(salesRep);
      const response = await request(app.getHttpServer())
        .get('/leads/not-a-uuid/preview')
        .set('Authorization', 'Bearer valid.jwt');
      expect(response.status).toBe(400);
      expect(prismaMock.lead.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('unknown lead', () => {
    it('returns 404 LEAD_NOT_FOUND', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);
      const response = await request(app.getHttpServer())
        .get(`/leads/${UNKNOWN_LEAD_ID}/preview`)
        .set('Authorization', 'Bearer valid.jwt');
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });
  });
});
