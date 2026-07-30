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

// End-to-end check of the full request chain for Module M7 — guards,
// validation pipes, controllers, services, the real ThemeProvider/
// compatibility scorer (packages/themes, not mocked — deterministic and
// dependency-free) and the (mocked) data layer wired together for real,
// same pattern as test/business-analysis.e2e-spec.ts. AI_TEXT_PROVIDER is
// overridden with a mock so no real Anthropic call is ever made.
describe('Theme Engine (e2e)', () => {
  let app: INestApplication;

  const LEAD_ID = '11111111-1111-4111-8111-111111111111';
  const BUSINESS_ID = '22222222-2222-4222-8222-222222222222';
  const ANALYSIS_ID = '33333333-3333-4333-8333-333333333333';
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
    ctaRecommendations: ['Order Online'],
    trustSignals: [],
    socialProofSuggestions: [],
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

  const prismaMock = {
    teamMember: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn() },
    business: { findUnique: jest.fn() },
    businessAnalysis: { findFirst: jest.fn() },
    themeConfiguration: { findFirst: jest.fn(), create: jest.fn() },
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

  function fakeConfigRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'config-1',
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
      componentSet: ['hero-banner', 'menu-showcase'],
      navigationStyle: NavigationStyle.TOP_BAR_STICKY,
      heroStyle: HeroStyle.FULL_BLEED_IMAGE,
      ctaStyle: CtaStyle.SOLID_BUTTON,
      cardStyle: CardStyle.IMAGE_OVERLAY,
      footerStyle: FooterStyle.MULTI_COLUMN,
      animationLevel: AnimationLevel.MODERATE,
      imageStyle: ImageStyle.PHOTOGRAPHY_REALISTIC,
      sectionOrder: ['hero', 'menu', 'gallery', 'contact', 'footer'],
      accessibilityProfile: {
        contrastLevel: 'AA',
        minTouchTargetPx: 44,
        reducedMotionSupport: true,
        altTextRequired: true,
      },
      mobilePreferences: {
        navigationPattern: 'hamburger',
        stackedLayout: true,
        tapTargetSizePx: 48,
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
      ...overrides,
    };
  }

  describe('authentication', () => {
    it('rejects POST /leads/:id/theme with no token', async () => {
      const response = await request(app.getHttpServer()).post(`/leads/${LEAD_ID}/theme`).send({});
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects GET /leads/:id/theme with no token', async () => {
      const response = await request(app.getHttpServer()).get(`/leads/${LEAD_ID}/theme`);
      expect(response.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    it('returns 403 for a Viewer on POST (lacks theme:select)', async () => {
      authenticateAs(viewer);
      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(403);
      expect(prismaMock.themeConfiguration.create).not.toHaveBeenCalled();
    });

    it('allows a Viewer on GET (leads:read is sufficient)', async () => {
      authenticateAs(viewer);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.themeConfiguration.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /leads/:id/theme', () => {
    it('returns null when no configuration exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.themeConfiguration.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });

    it('returns the latest configuration when one exists', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.themeConfiguration.findFirst.mockResolvedValue(fakeConfigRow());

      const response = await request(app.getHttpServer())
        .get(`/leads/${LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'config-1',
        themeId: 'restaurant',
        navigationStyle: 'top-bar-sticky',
      });
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/leads/${UNKNOWN_LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });
  });

  describe('POST /leads/:id/theme', () => {
    it('returns 404 BUSINESS_ANALYSIS_NOT_FOUND when no completed analysis exists yet', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.business.findUnique.mockResolvedValue(business);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BUSINESS_ANALYSIS_NOT_FOUND');
    });

    it('runs the full AI-recommends + rules-rank flow and returns 201 with a ranked theme list on a cache miss', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.business.findUnique.mockResolvedValue(business);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(analysisRow);
      prismaMock.themeConfiguration.findFirst.mockResolvedValue(null);
      aiTextProviderMock.complete.mockResolvedValue({
        rawText: JSON.stringify({
          themeId: 'restaurant',
          confidence: 0.95,
          reasoning: 'Menu-focused business.',
        }),
        promptTokens: 100,
        completionTokens: 30,
        model: 'claude-sonnet-5',
        stopReason: 'end_turn',
        durationMs: 50,
      });
      prismaMock.themeConfiguration.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'config-new',
            selectedAt: new Date(),
            createdAt: new Date(),
            ...data,
          }),
      );

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(201);
      expect(response.body.themeId).toBe('restaurant');
      expect(response.body.businessAnalysisId).toBe(ANALYSIS_ID);
      // Brand-identity fields carried through exactly as produced by M6.
      expect(response.body.colorPalette).toEqual(brandBrief.colorPalette);
      expect(response.body.typography).toEqual(brandBrief.typography);
      expect(response.body.layoutStyle).toBe(brandBrief.layoutStyle);
      // Founder's explicit ranking requirement.
      expect(Array.isArray(response.body.rankedThemes)).toBe(true);
      expect(response.body.rankedThemes.length).toBeGreaterThanOrEqual(1);
      expect(response.body.rankedThemes[0]).toMatchObject({ rank: 1, themeId: 'restaurant' });
      expect(typeof response.body.compatibilityScore).toBe('number');
      expect(response.body.selectedByEngineVersion).toBe('v1.0');
      // D-048: CostService integration — reserved before the AI call, then
      // actual provider/model/tokens/cost/duration persisted on success.
      expect(cacheMock.incrementCounter).toHaveBeenCalledWith(
        expect.stringContaining('cost:monthly:'),
        0.02,
        expect.any(Number),
      );
      expect(prismaMock.costEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'theme_ai_recommendation', costUsd: 0.02 }),
        }),
      );
      expect(response.body.aiRecommendationProvider).toBe('claude');
      expect(response.body.aiRecommendationModel).toBe('claude-sonnet-5');
      expect(response.body.aiRecommendationPromptTokens).toBe(100);
      expect(response.body.aiRecommendationCompletionTokens).toBe(30);
      expect(response.body.aiRecommendationTotalTokens).toBe(130);
      expect(typeof response.body.aiRecommendationCostUsd).toBe('number');
      expect(typeof response.body.aiRecommendationExecutionTimeMs).toBe('number');
    });

    it('proceeds with rules-only ranking (no AI call) and null AI-usage fields when the monthly cost ceiling has been reached', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.business.findUnique.mockResolvedValue(business);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(analysisRow);
      prismaMock.themeConfiguration.findFirst.mockResolvedValue(null);
      cacheMock.incrementCounter.mockResolvedValue(301);
      prismaMock.themeConfiguration.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'config-new',
            selectedAt: new Date(),
            createdAt: new Date(),
            ...data,
          }),
      );

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(201);
      expect(response.body.themeId).toBe('restaurant');
      expect(aiTextProviderMock.complete).not.toHaveBeenCalled();
      expect(prismaMock.costEvent.create).not.toHaveBeenCalled();
      // Mock's create() naively echoes `data` back (unlike real Prisma,
      // which turns an unset nullable column into `null` on read) — the
      // AI step being skipped means these were never set, so they're
      // falsy (undefined here) either way.
      expect(response.body.aiRecommendationProvider).toBeFalsy();
      expect(response.body.aiRecommendationCostUsd).toBeFalsy();
    });

    it('returns 200 with the cached configuration on a repeat call against the same businessAnalysisId', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(leadRow);
      prismaMock.business.findUnique.mockResolvedValue(business);
      prismaMock.businessAnalysis.findFirst.mockResolvedValue(analysisRow);
      prismaMock.themeConfiguration.findFirst.mockResolvedValue(fakeConfigRow());

      const response = await request(app.getHttpServer())
        .post(`/leads/${LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: 'config-1', themeId: 'restaurant' });
      expect(prismaMock.themeConfiguration.create).not.toHaveBeenCalled();
      expect(aiTextProviderMock.complete).not.toHaveBeenCalled();
    });

    it('returns 404 LEAD_NOT_FOUND for an unknown lead', async () => {
      authenticateAs(salesRep);
      prismaMock.lead.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post(`/leads/${UNKNOWN_LEAD_ID}/theme`)
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for a malformed (non-UUID) lead id', async () => {
      authenticateAs(salesRep);

      const response = await request(app.getHttpServer())
        .post('/leads/not-a-uuid/theme')
        .set('Authorization', 'Bearer valid.jwt');

      expect(response.status).toBe(400);
      expect(prismaMock.lead.findUnique).not.toHaveBeenCalled();
    });
  });
});
