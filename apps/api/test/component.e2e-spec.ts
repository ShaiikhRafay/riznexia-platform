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
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { REDIS_CACHE } from '../src/common/cache/cache.constants';
import { PRISMA_CLIENT } from '../src/common/database/database.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ClerkService } from '../src/auth/clerk.service';

// End-to-end check of the full request chain for Module M8.2 — guards,
// validation pipes, controllers, services, and the real, unmocked
// generateComponentManifest()/validateComponentManifest()
// (@riznexia/website-generator is pure/deterministic, no external
// dependency to mock) wired together for real, same pattern as
// test/layout.e2e-spec.ts. AI_TEXT_PROVIDER is still overridden since
// AppModule boots every module, including M6's, but this flow never calls it.
describe('Component Generator (e2e)', () => {
  let app: INestApplication;

  const LEAD_ID = '11111111-1111-4111-8111-111111111111';
  const BUSINESS_ID = '22222222-2222-4222-8222-222222222222';
  const ANALYSIS_ID = '33333333-3333-4333-8333-333333333333';
  const THEME_CONFIG_ID = '55555555-5555-4555-8555-555555555555';
  const LAYOUT_CONFIG_ID = '66666666-6666-4666-8666-666666666666';
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
    latitude: null,
    longitude: null,
    phone: null,
    rating: 4.5,
    reviewCount: 120,
    openingHours: null,
    photos: null,
    businessStatus: BusinessOperatingStatus.OPERATIONAL,
    googleBusinessUrl: null,
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

  const layoutConfigRow = {
    id: LAYOUT_CONFIG_ID,
    businessId: BUSINESS_ID,
    businessAnalysisId: ANALYSIS_ID,
    themeConfigurationId: THEME_CONFIG_ID,
    configVersion: 1,
    layoutEngineVersion: 'v1.0',
    pageStructure: [
      { sectionId: 'hero', order: 1, layoutType: 'full-width' },
      { sectionId: 'about', order: 2, layoutType: 'contained' },
      { sectionId: 'menu', order: 3, layoutType: 'grid' },
      { sectionId: 'gallery', order: 4, layoutType: 'grid' },
      { sectionId: 'testimonials', order: 5, layoutType: 'grid' },
      { sectionId: 'reservation-cta', order: 6, layoutType: 'grid' },
      { sectionId: 'contact', order: 7, layoutType: 'grid' },
      { sectionId: 'footer', order: 8, layoutType: 'contained' },
    ],
    navigation: {
      style: 'top-bar-sticky',
      position: 'top',
      sticky: true,
      items: ['about', 'menu', 'gallery', 'testimonials', 'reservation-cta', 'contact'],
      mobileBehavior: 'hamburger',
    },
    hero: {
      style: 'full-bleed-image',
      mediaPosition: 'background',
      contentAlignment: 'center',
      ctaSlots: 2,
    },
    footer: {
      style: 'multi-column',
      columns: 4,
      includesNewsletter: false,
      includesSocialLinks: true,
    },
    sidebar: null,
    grid: [
      { sectionId: 'menu', columns: { mobile: 1, tablet: 2, desktop: 3 }, gap: 'standard' },
      { sectionId: 'gallery', columns: { mobile: 1, tablet: 2, desktop: 3 }, gap: 'standard' },
      { sectionId: 'testimonials', columns: { mobile: 1, tablet: 2, desktop: 3 }, gap: 'standard' },
      {
        sectionId: 'reservation-cta',
        columns: { mobile: 1, tablet: 2, desktop: 3 },
        gap: 'standard',
      },
      { sectionId: 'contact', columns: { mobile: 1, tablet: 2, desktop: 3 }, gap: 'standard' },
    ],
    responsiveRules: {
      breakpoints: { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 },
      stackedLayout: true,
      tapTargetSizePx: 48,
      perSection: {
        hero: 'reflow',
        about: 'reflow',
        menu: 'stack',
        gallery: 'stack',
        testimonials: 'stack',
        'reservation-cta': 'stack',
        contact: 'stack',
        footer: 'reflow',
      },
    },
    ctaPlacements: [{ ctaText: 'Order Online', zone: 'hero', style: 'solid-button' }],
    componentPlaceholders: [
      { componentId: 'hero-banner', sectionId: 'hero', order: 0 },
      { componentId: 'menu-showcase', sectionId: 'menu', order: 0 },
      { componentId: 'gallery-grid', sectionId: 'gallery', order: 0 },
      { componentId: 'testimonial-carousel', sectionId: 'testimonials', order: 0 },
      { componentId: 'reservation-cta', sectionId: 'reservation-cta', order: 0 },
      { componentId: 'map-embed', sectionId: 'contact', order: 0 },
    ],
    createdAt: new Date('2026-01-04T00:00:00Z'),
  };

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn() },
    business: { findUnique: jest.fn() },
    businessAnalysis: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    themeConfiguration: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    layoutConfiguration: { findFirst: jest.fn() },
    componentManifest: { findFirst: jest.fn(), create: jest.fn() },
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

  function fakeComponentManifestRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'manifest-1',
      businessId: BUSINESS_ID,
      businessAnalysisId: ANALYSIS_ID,
      themeConfigurationId: THEME_CONFIG_ID,
      layoutConfigurationId: LAYOUT_CONFIG_ID,
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
      createdAt: new Date('2026-01-05T00:00:00Z'),
      ...overrides,
    };
  }

  describe('authentication', () => {
    it('rejects POST /leads/:id/components with no token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/components`)
        .send({});
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects GET /leads/:id/components with no token', async () => {
      const response = await request(app.getHttpServer()).get(`/leads/${LEAD_ID}/components`);
      expect(response.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    it('returns 403 for a Viewer on POST (lacks component:generate)', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(403);
      expect(prismaMock.componentManifest.create).not.toHaveBeenCalled();
    });

    it('allows a Viewer on GET (leads:read is sufficient)', async () => {
      authenticateAs(viewer);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.componentManifest.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /leads/:id/components', () => {
    it('returns null when no manifest exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.componentManifest.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });

    it('returns the latest manifest when one exists', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.componentManifest.findFirst.mockResolvedValue(fakeComponentManifestRow());

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: 'manifest-1', componentEngineVersion: 'v1.0' });
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${UNKNOWN_LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });
  });

  describe('POST /leads/:id/components', () => {
    it('returns 404 LAYOUT_CONFIGURATION_NOT_FOUND when no layout configuration exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.layoutConfiguration.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LAYOUT_CONFIGURATION_NOT_FOUND');
    });

    it('runs the real deterministic component generation and returns 201 on a cache miss', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.layoutConfiguration.findFirst.mockResolvedValue(layoutConfigRow);
      prismaMock.componentManifest.findFirst.mockResolvedValue(null);
      prismaMock.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeConfigRow);
      prismaMock.businessAnalysis.findUniqueOrThrow.mockResolvedValue(analysisRow);
      prismaMock.componentManifest.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'manifest-new', createdAt: new Date(), ...data }),
      );

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(201);
      expect(response.body.layoutConfigurationId).toBe(LAYOUT_CONFIG_ID);
      expect(response.body.themeConfigurationId).toBe(THEME_CONFIG_ID);
      expect(response.body.businessAnalysisId).toBe(ANALYSIS_ID);

      // Deterministic generation, verified end-to-end (no mocked generator).
      const components: Array<{
        componentId: string;
        componentType: string;
        parentComponentId: string | null;
      }> = response.body.components;
      const nav = components.find((c) => c.componentType === 'navigation');
      expect(nav).toBeDefined();
      expect(nav?.parentComponentId).toBeNull();

      const menuSection = components.find((c) => c.componentId === 'section-menu');
      expect(menuSection?.parentComponentId).toBeNull();

      const menuComponent = components.find((c) => c.componentId === 'menu-showcase');
      expect(menuComponent).toMatchObject({
        componentType: 'menu-list',
        parentComponentId: 'section-menu',
      });

      const heroComponent = components.find((c) => c.componentId === 'hero-banner');
      expect(heroComponent?.componentType).toBe('hero');
      // "Only supported components may be generated" — every componentId
      // in componentSet classifies onto a real SupportedComponentType.
      expect(
        components.every((c) => typeof c.componentType === 'string' && c.componentType.length > 0),
      ).toBe(true);

      expect(response.body.themeTokens.primary).toBe(brandBrief.colorPalette.primary);
      expect(response.body.themeTokens.radius).toEqual({
        small: '4px',
        medium: '8px',
        large: '16px',
        full: '9999px',
      });
    });

    it('returns 200 with the cached manifest on a repeat call against the same layoutConfigurationId', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.layoutConfiguration.findFirst.mockResolvedValue(layoutConfigRow);
      prismaMock.componentManifest.findFirst.mockResolvedValue(fakeComponentManifestRow());

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'manifest-1',
        layoutConfigurationId: LAYOUT_CONFIG_ID,
      });
      expect(prismaMock.componentManifest.create).not.toHaveBeenCalled();
      expect(prismaMock.themeConfiguration.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prismaMock.businessAnalysis.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${UNKNOWN_LEAD_ID}/components`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for a malformed (non-UUID) lead id', async () => {
      authenticateAs(salesRep);

      const response = await request(app.getHttpServer())
        .post('/leads/not-a-uuid/components')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(400);
      expect(prismaMock.lead.findUnique).not.toHaveBeenCalled();
    });
  });
});
