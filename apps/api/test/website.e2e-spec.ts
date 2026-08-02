import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
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

// End-to-end check of the full request chain for Module M8.4 — guards,
// validation pipes, controllers, services, and the real, unmocked
// assembleWebsite()/validateWebsiteAssembly() (@riznexia/website-generator
// is pure/deterministic, no external dependency to mock) wired together
// for real, same pattern as test/content.e2e-spec.ts. AI_TEXT_PROVIDER is
// still overridden since AppModule boots every module, including M6's,
// but this flow never calls it.
describe('Website Assembly (e2e)', () => {
  let app: INestApplication;

  const LEAD_ID = '11111111-1111-4111-8111-111111111111';
  const BUSINESS_ID = '22222222-2222-4222-8222-222222222222';
  const ANALYSIS_ID = '33333333-3333-4333-8333-333333333333';
  const THEME_CONFIG_ID = '55555555-5555-4555-8555-555555555555';
  const LAYOUT_CONFIG_ID = '66666666-6666-4666-8666-666666666666';
  const COMPONENT_MANIFEST_ID = '77777777-7777-4777-8777-777777777777';
  const CONTENT_MANIFEST_ID = '88888888-8888-4888-8888-888888888888';
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

  // Real generateLayout()/generateComponentManifest()/generateContentManifest()
  // output, wrapped in row shape — so this e2e spec exercises the real
  // M8.1/M8.2/M8.3 generators feeding into M8.4, not a hand-authored
  // ContentManifest assembleWebsite() would reject.
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

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn() },
    business: { findUnique: jest.fn() },
    businessAnalysis: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    themeConfiguration: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    layoutConfiguration: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    componentManifest: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    contentManifest: { findFirst: jest.fn() },
    generatedWebsite: { findFirst: jest.fn(), create: jest.fn() },
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

  function fakeGeneratedWebsiteRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'generated-website-1',
      businessId: BUSINESS_ID,
      businessAnalysisId: ANALYSIS_ID,
      themeConfigurationId: THEME_CONFIG_ID,
      layoutConfigurationId: LAYOUT_CONFIG_ID,
      componentManifestId: COMPONENT_MANIFEST_ID,
      contentManifestId: CONTENT_MANIFEST_ID,
      configVersion: 1,
      assemblyEngineVersion: 'v1.0',
      files: [{ path: 'package.json', content: '{}' }],
      createdAt: new Date('2026-01-07T00:00:00Z'),
      ...overrides,
    };
  }

  describe('authentication', () => {
    it('rejects POST /leads/:id/website with no token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/website`)
        .send({});
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects GET /leads/:id/website with no token', async () => {
      const response = await request(app.getHttpServer()).get(`/leads/${LEAD_ID}/website`);
      expect(response.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    it('returns 403 for a Viewer on POST (lacks website:assemble)', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(403);
      expect(prismaMock.generatedWebsite.create).not.toHaveBeenCalled();
    });

    it('allows a Viewer on GET (leads:read is sufficient)', async () => {
      authenticateAs(viewer);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.generatedWebsite.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /leads/:id/website', () => {
    it('returns null when no generated website exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.generatedWebsite.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });

    it('returns the latest generated website when one exists', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.generatedWebsite.findFirst.mockResolvedValue(fakeGeneratedWebsiteRow());

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'generated-website-1',
        assemblyEngineVersion: 'v1.0',
      });
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${UNKNOWN_LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });
  });

  describe('POST /leads/:id/website', () => {
    it('returns 404 CONTENT_MANIFEST_NOT_FOUND when no content manifest exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.contentManifest.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('CONTENT_MANIFEST_NOT_FOUND');
    });

    it('runs the real deterministic assembler and returns 201 on a cache miss', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.contentManifest.findFirst.mockResolvedValue(contentManifestRow);
      prismaMock.generatedWebsite.findFirst.mockResolvedValue(null);
      prismaMock.themeConfiguration.findUniqueOrThrow.mockResolvedValue(themeConfigRow);
      prismaMock.layoutConfiguration.findUniqueOrThrow.mockResolvedValue(layoutConfigRow);
      prismaMock.componentManifest.findUniqueOrThrow.mockResolvedValue(componentManifestRow);
      prismaMock.generatedWebsite.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'generated-website-new', createdAt: new Date(), ...data }),
      );

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(201);
      expect(response.body.contentManifestId).toBe(CONTENT_MANIFEST_ID);
      expect(response.body.componentManifestId).toBe(COMPONENT_MANIFEST_ID);
      expect(response.body.layoutConfigurationId).toBe(LAYOUT_CONFIG_ID);
      expect(response.body.themeConfigurationId).toBe(THEME_CONFIG_ID);
      expect(response.body.businessAnalysisId).toBe(ANALYSIS_ID);
      expect(response.body.assemblyEngineVersion).toBe('v1.0');

      // Real, deterministic assembly, verified end-to-end (no mocked assembler).
      const files = response.body.files as { path: string; content: string }[];
      expect(files.some((f) => f.path === 'app/page.tsx')).toBe(true);
      expect(files.some((f) => f.path === 'lib/site-data.ts')).toBe(true);
      expect(files.some((f) => f.path === 'app/theme-tokens.css')).toBe(true);
      expect(files.some((f) => f.path === 'components/sections/hero.tsx')).toBe(true);

      const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content);
      expect(pkg.name).toBe('joe-s-diner');

      const page = files.find((f) => f.path === 'app/page.tsx')!;
      expect(page.content).toContain('export default function Page');
      expect(page.content).toContain('application/ld+json');
    });

    it('returns 200 with the cached website on a repeat call against the same contentManifestId', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.contentManifest.findFirst.mockResolvedValue(contentManifestRow);
      prismaMock.generatedWebsite.findFirst.mockResolvedValue(fakeGeneratedWebsiteRow());

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'generated-website-1',
        contentManifestId: CONTENT_MANIFEST_ID,
      });
      expect(prismaMock.generatedWebsite.create).not.toHaveBeenCalled();
      expect(prismaMock.themeConfiguration.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${UNKNOWN_LEAD_ID}/website`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for a malformed (non-UUID) lead id', async () => {
      authenticateAs(salesRep);

      const response = await request(app.getHttpServer())
        .post('/leads/not-a-uuid/website')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(400);
      expect(prismaMock.lead.findUnique).not.toHaveBeenCalled();
    });
  });
});
