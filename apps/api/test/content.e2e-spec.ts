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
import { generateComponentManifest, generateLayout } from '@riznexia/website-generator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ClerkService } from '../src/auth/clerk.service';

// End-to-end check of the full request chain for Module M8.3 — guards,
// validation pipes, controllers, services, and the real, unmocked
// generateContentManifest()/validateContentManifest()
// (@riznexia/website-generator is pure/deterministic, no external
// dependency to mock) wired together for real, same pattern as
// test/component.e2e-spec.ts. AI_TEXT_PROVIDER is still overridden since
// AppModule boots every module, including M6's, but this flow never calls it.
describe('Content Binding (e2e)', () => {
  let app: INestApplication;

  const LEAD_ID = '11111111-1111-4111-8111-111111111111';
  const BUSINESS_ID = '22222222-2222-4222-8222-222222222222';
  const ANALYSIS_ID = '33333333-3333-4333-8333-333333333333';
  const THEME_CONFIG_ID = '55555555-5555-4555-8555-555555555555';
  const LAYOUT_CONFIG_ID = '66666666-6666-4666-8666-666666666666';
  const COMPONENT_MANIFEST_ID = '77777777-7777-4777-8777-777777777777';
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

  // Real generateLayout()/generateComponentManifest() output, wrapped in
  // row shape — so this e2e spec exercises the real M8.1/M8.2 generators
  // feeding into M8.3, not a hand-authored components array.
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

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn() },
    business: { findUnique: jest.fn() },
    businessAnalysis: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    themeConfiguration: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    layoutConfiguration: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    componentManifest: { findFirst: jest.fn() },
    contentManifest: { findFirst: jest.fn(), create: jest.fn() },
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

  function fakeContentManifestRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'content-manifest-1',
      businessId: BUSINESS_ID,
      businessAnalysisId: ANALYSIS_ID,
      themeConfigurationId: THEME_CONFIG_ID,
      layoutConfigurationId: LAYOUT_CONFIG_ID,
      componentManifestId: COMPONENT_MANIFEST_ID,
      configVersion: 1,
      contentEngineVersion: 'v1.0',
      componentContent: [],
      unresolvedBindings: [],
      seoMetadata: {
        keywords: { value: ['diner near me'], source: 'BusinessAnalysis.brandBrief.seoKeywords' },
        localSeoSuggestions: {
          value: [],
          source: 'BusinessAnalysis.brandBrief.localSeoSuggestions',
        },
        metaTitle: { value: "Joe's Diner | Italian Restaurant in Karachi", source: 'x' },
        metaDescription: { value: brandBrief.businessSummary, source: 'x' },
      },
      structuredData: [],
      createdAt: new Date('2026-01-06T00:00:00Z'),
      ...overrides,
    };
  }

  describe('authentication', () => {
    it('rejects POST /leads/:id/content with no token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/content`)
        .send({});
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects GET /leads/:id/content with no token', async () => {
      const response = await request(app.getHttpServer()).get(`/leads/${LEAD_ID}/content`);
      expect(response.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    it('returns 403 for a Viewer on POST (lacks content:bind)', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(403);
      expect(prismaMock.contentManifest.create).not.toHaveBeenCalled();
    });

    it('allows a Viewer on GET (leads:read is sufficient)', async () => {
      authenticateAs(viewer);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.contentManifest.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /leads/:id/content', () => {
    it('returns null when no manifest exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.contentManifest.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });

    it('returns the latest manifest when one exists', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.contentManifest.findFirst.mockResolvedValue(fakeContentManifestRow());

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'content-manifest-1',
        contentEngineVersion: 'v1.0',
      });
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${UNKNOWN_LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });
  });

  describe('POST /leads/:id/content', () => {
    it('returns 404 COMPONENT_MANIFEST_NOT_FOUND when no component manifest exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.componentManifest.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('COMPONENT_MANIFEST_NOT_FOUND');
    });

    it('runs the real deterministic content binding and returns 201 on a cache miss', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.componentManifest.findFirst.mockResolvedValue(componentManifestRow);
      prismaMock.contentManifest.findFirst.mockResolvedValue(null);
      prismaMock.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeConfigRow);
      prismaMock.layoutConfiguration.findUniqueOrThrow.mockResolvedValue(layoutConfigRow);
      prismaMock.businessAnalysis.findUniqueOrThrow.mockResolvedValue(analysisRow);
      prismaMock.business.findUnique.mockResolvedValue(business);
      prismaMock.contentManifest.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'content-manifest-new', createdAt: new Date(), ...data }),
      );

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(201);
      expect(response.body.componentManifestId).toBe(COMPONENT_MANIFEST_ID);
      expect(response.body.layoutConfigurationId).toBe(LAYOUT_CONFIG_ID);
      expect(response.body.themeConfigurationId).toBe(THEME_CONFIG_ID);
      expect(response.body.businessAnalysisId).toBe(ANALYSIS_ID);

      // Deterministic binding, verified end-to-end (no mocked binder).
      const heroBinding = response.body.componentContent.find(
        (c: { componentId: string }) => c.componentId === 'hero-banner',
      );
      const headline = heroBinding.fields.find(
        (f: { slotName: string }) => f.slotName === 'headline',
      );
      expect(headline.value).toEqual({
        value: brandBrief.uniqueSellingPoints[0],
        source: 'BusinessAnalysis.brandBrief.uniqueSellingPoints[0]',
      });

      const mapBinding = response.body.componentContent.find(
        (c: { componentId: string }) => c.componentId === 'map-embed',
      );
      const address = mapBinding.fields.find((f: { slotName: string }) => f.slotName === 'address');
      expect(address.value).toEqual({
        value: '123 Main St, Karachi',
        source: 'Business.address+Business.city',
      });

      // Every field is traceable to its origin (founder's explicit requirement).
      for (const binding of response.body.componentContent) {
        for (const field of binding.fields) {
          expect(typeof field.value.source).toBe('string');
          expect(field.value.source.length).toBeGreaterThan(0);
        }
      }

      expect(response.body.seoMetadata.metaTitle.value).toBe(
        "Joe's Diner | Italian Restaurant in Karachi",
      );
      expect(
        response.body.structuredData.some(
          (entry: { type: string }) => entry.type === 'LocalBusiness',
        ),
      ).toBe(true);
      // No FAQ source exists anywhere in this pipeline — FAQPage stays absent.
      expect(
        response.body.structuredData.some((entry: { type: string }) => entry.type === 'FAQPage'),
      ).toBe(false);
    });

    it('returns 200 with the cached manifest on a repeat call against the same componentManifestId', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.componentManifest.findFirst.mockResolvedValue(componentManifestRow);
      prismaMock.contentManifest.findFirst.mockResolvedValue(fakeContentManifestRow());

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'content-manifest-1',
        componentManifestId: COMPONENT_MANIFEST_ID,
      });
      expect(prismaMock.contentManifest.create).not.toHaveBeenCalled();
      expect(prismaMock.themeConfiguration.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prismaMock.businessAnalysis.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${UNKNOWN_LEAD_ID}/content`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for a malformed (non-UUID) lead id', async () => {
      authenticateAs(salesRep);

      const response = await request(app.getHttpServer())
        .post('/leads/not-a-uuid/content')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(400);
      expect(prismaMock.lead.findUnique).not.toHaveBeenCalled();
    });
  });
});
