import {
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
  WebsiteStatusType,
} from '@riznexia/db';
import type { Business, PrismaClient } from '@riznexia/db';
import type { ThemeDefinition } from '@riznexia/themes';
import type { Lead } from '@riznexia/shared-types';
import { AiService } from '@riznexia/ai';
import {
  BusinessAnalysisNotFoundException,
  BusinessNotFoundException,
  LeadNotFoundException,
  QuotaExceededException,
  ThemeNotFoundException,
} from '../common/exceptions/app.exception';
import type { BusinessService } from '../business/business.service';
import type { LeadsService } from '../leads/leads.service';
import type { CostService } from '../common/cost/cost.service';
import { AI_THEME_RECOMMENDATION_ESTIMATED_COST_USD } from '../common/cost/cost.constants';
import { ThemeSelectionService } from './theme-selection.service';
import { THEME_ENGINE_VERSION } from './theme-engine.constants';

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

function fakeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 'business-1',
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
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Business;
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
    socialProofSuggestions: [],
    imageRecommendations: [],
    contentRecommendations: ['Highlight family history'],
    ...overrides,
  };
}

function fakeAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    id: 'analysis-1',
    businessId: 'business-1',
    analysisVersion: 1,
    status: PrismaAnalysisStatus.COMPLETED,
    brandBrief: fakeBrandBrief(),
    ...overrides,
  };
}

function fakeThemeDefinition(overrides: Partial<ThemeDefinition> = {}): ThemeDefinition {
  return {
    id: 'restaurant',
    name: 'Restaurant',
    version: 'v1.0',
    hash: 'hash-abc',
    createdAt: '2026-07-30',
    updatedAt: '2026-07-30',
    content: {
      industryCategories: ['restaurant', 'cafe'],
      layoutKeywords: ['warm', 'inviting', 'image-forward'],
      componentSet: ['hero-banner', 'menu-showcase'],
      navigationStyle: 'top-bar-sticky',
      heroStyle: 'full-bleed-image',
      ctaStyle: 'solid-button',
      cardStyle: 'image-overlay',
      footerStyle: 'multi-column',
      animationLevel: 'moderate',
      imageStyle: 'photography-realistic',
      sectionOrder: ['hero', 'menu', 'contact', 'footer'],
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
      sectionComponentMap: {
        hero: ['hero-banner'],
        menu: ['menu-showcase'],
        contact: [],
        footer: [],
      },
    },
    ...overrides,
  };
}

function fakeThemeConfigRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'config-1',
    businessId: 'business-1',
    businessAnalysisId: 'analysis-1',
    configVersion: 1,
    themeId: 'restaurant',
    themeName: 'Restaurant',
    themeVersion: 'v1.0',
    themeHash: 'hash-abc',
    selectedAt: new Date(),
    selectedByEngineVersion: THEME_ENGINE_VERSION,
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
    rankedThemes: [
      {
        rank: 1,
        themeId: 'restaurant',
        themeName: 'Restaurant',
        themeVersion: 'v1.0',
        themeHash: 'hash-abc',
        compatibilityScore: 95,
      },
    ],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ThemeSelectionService', () => {
  let prisma: {
    businessAnalysis: { findFirst: jest.Mock };
    themeConfiguration: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let leadsService: { findById: jest.Mock };
  let businessService: { findById: jest.Mock };
  let themeProvider: { listThemes: jest.Mock; getTheme: jest.Mock };
  let aiService: { recommendThemeCategory: jest.Mock };
  let costService: { charge: jest.Mock };
  let service: ThemeSelectionService;

  beforeEach(() => {
    prisma = {
      businessAnalysis: { findFirst: jest.fn() },
      themeConfiguration: { findFirst: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          themeConfiguration: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(fakeThemeConfigRow()),
          },
        }),
      ),
    };
    leadsService = { findById: jest.fn().mockResolvedValue(fakeLead()) };
    businessService = { findById: jest.fn().mockResolvedValue(fakeBusiness()) };
    themeProvider = {
      listThemes: jest.fn().mockReturnValue([fakeThemeDefinition()]),
      getTheme: jest.fn(),
    };
    aiService = {
      recommendThemeCategory: jest
        .fn()
        .mockResolvedValue({
          status: 'completed',
          themeId: 'restaurant',
          confidence: 0.9,
          reasoning: 'x',
          aiProvider: 'CLAUDE',
          aiModel: 'claude-sonnet-5',
          promptTokens: 1,
          completionTokens: 1,
        }),
    };
    costService = { charge: jest.fn().mockResolvedValue(undefined) };

    service = new ThemeSelectionService(
      prisma as unknown as PrismaClient,
      leadsService as unknown as LeadsService,
      businessService as unknown as BusinessService,
      themeProvider,
      aiService as unknown as AiService,
      costService as unknown as CostService,
    );
  });

  describe('findLatestForLead', () => {
    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.findLatestForLead('missing')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('returns null when no configuration exists yet', async () => {
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);
      expect(await service.findLatestForLead('lead-1')).toBeNull();
    });

    it('returns the latest configuration, mapped to the API shape', async () => {
      prisma.themeConfiguration.findFirst.mockResolvedValue(fakeThemeConfigRow());
      const result = await service.findLatestForLead('lead-1');
      expect(result).toMatchObject({
        id: 'config-1',
        themeId: 'restaurant',
        navigationStyle: 'top-bar-sticky',
      });
    });
  });

  describe('selectTheme', () => {
    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.selectTheme('missing')).rejects.toBeInstanceOf(LeadNotFoundException);
    });

    it('throws BusinessNotFoundException when the business is missing', async () => {
      businessService.findById.mockResolvedValue(null);
      await expect(service.selectTheme('lead-1')).rejects.toBeInstanceOf(BusinessNotFoundException);
    });

    it('throws BusinessAnalysisNotFoundException when no completed analysis exists', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.selectTheme('lead-1')).rejects.toBeInstanceOf(
        BusinessAnalysisNotFoundException,
      );
    });

    it('returns cacheHit:true when a configuration already exists for this businessAnalysisId', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(fakeThemeConfigRow());

      const result = await service.selectTheme('lead-1');

      expect(result.cacheHit).toBe(true);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(aiService.recommendThemeCategory).not.toHaveBeenCalled();
      expect(costService.charge).not.toHaveBeenCalled();
    });

    it('runs AI recommendation, ranks themes, and persists a new configuration on a cache miss', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);

      const result = await service.selectTheme('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(aiService.recommendThemeCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: 'Italian Restaurant',
          registeredThemeIds: ['restaurant'],
        }),
      );
      expect(result.configuration.themeId).toBe('restaurant');
      expect(result.configuration.selectedByEngineVersion).toBe(THEME_ENGINE_VERSION);
      // Brand-identity fields carried through verbatim from BusinessAnalysis.
      expect(result.configuration.colorPalette).toEqual(fakeBrandBrief().colorPalette);
      expect(result.configuration.layoutStyle).toBe('Warm and inviting, image-forward');
    });

    it('proceeds with rules-only ranking when the AI recommendation fails (resilience)', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);
      aiService.recommendThemeCategory.mockResolvedValue({
        status: 'failed',
        reason: 'network timeout',
      });

      const result = await service.selectTheme('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(result.configuration.themeId).toBe('restaurant');
    });

    it('proceeds with rules-only ranking when the AI call throws unexpectedly', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);
      aiService.recommendThemeCategory.mockRejectedValue(new Error('unexpected'));

      const result = await service.selectTheme('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(result.configuration.themeId).toBe('restaurant');
    });

    it('reserves estimated cost via CostService.charge() before calling the AI recommendation', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);

      const callOrder: string[] = [];
      costService.charge.mockImplementation(async () => {
        callOrder.push('charge');
      });
      aiService.recommendThemeCategory.mockImplementation(async () => {
        callOrder.push('recommend');
        return {
          status: 'completed',
          themeId: 'restaurant',
          confidence: 0.9,
          reasoning: 'x',
          aiProvider: 'CLAUDE',
          aiModel: 'claude-sonnet-5',
          promptTokens: 1,
          completionTokens: 1,
        };
      });

      await service.selectTheme('lead-1');

      expect(costService.charge).toHaveBeenCalledWith(
        'theme_ai_recommendation',
        AI_THEME_RECOMMENDATION_ESTIMATED_COST_USD,
        expect.objectContaining({ businessId: 'business-1' }),
      );
      expect(callOrder).toEqual(['charge', 'recommend']);
    });

    it('proceeds with rules-only ranking when CostService.charge() rejects with QuotaExceededException (monthly ceiling reached)', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);
      costService.charge.mockRejectedValue(new QuotaExceededException());

      const result = await service.selectTheme('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(result.configuration.themeId).toBe('restaurant');
      expect(aiService.recommendThemeCategory).not.toHaveBeenCalled();
    });

    it('persists provider, model, token usage, cost, and execution duration on a successful AI recommendation', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);
      aiService.recommendThemeCategory.mockResolvedValue({
        status: 'completed',
        themeId: 'restaurant',
        confidence: 0.9,
        reasoning: 'x',
        aiProvider: 'CLAUDE',
        aiModel: 'claude-sonnet-5',
        promptTokens: 100,
        completionTokens: 50,
      });
      const txCreate = jest.fn().mockResolvedValue(fakeThemeConfigRow());
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          themeConfiguration: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: txCreate,
          },
        }),
      );

      await service.selectTheme('lead-1');

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiRecommendationProvider: 'CLAUDE',
            aiRecommendationModel: 'claude-sonnet-5',
            aiRecommendationPromptTokens: 100,
            aiRecommendationCompletionTokens: 50,
            aiRecommendationTotalTokens: 150,
            aiRecommendationCostUsd: expect.any(Number),
            aiRecommendationExecutionTimeMs: expect.any(Number),
          }),
        }),
      );
    });

    it('leaves AI usage fields unset when the AI recommendation fails', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);
      aiService.recommendThemeCategory.mockResolvedValue({
        status: 'failed',
        reason: 'network timeout',
      });
      const txCreate = jest.fn().mockResolvedValue(fakeThemeConfigRow());
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          themeConfiguration: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: txCreate,
          },
        }),
      );

      await service.selectTheme('lead-1');

      const data = txCreate.mock.calls[0][0].data;
      expect(data.aiRecommendationProvider).toBeUndefined();
      expect(data.aiRecommendationModel).toBeUndefined();
      expect(data.aiRecommendationCostUsd).toBeUndefined();
    });

    it('throws ThemeNotFoundException when no registered theme clears the minimum compatibility score', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);
      aiService.recommendThemeCategory.mockResolvedValue({ status: 'failed', reason: 'n/a' });
      // A theme whose every signal is deliberately mismatched against the
      // business — real scoring logic drives this to well below the
      // MINIMUM_COMPATIBILITY_SCORE threshold.
      themeProvider.listThemes.mockReturnValue([
        fakeThemeDefinition({
          id: 'mismatched-test-theme' as never,
          content: {
            ...fakeThemeDefinition().content,
            industryCategories: ['completely-unrelated-xyz'],
            layoutKeywords: ['nonmatching-keyword-xyz'],
            componentSet: [],
            sectionOrder: [],
          },
        }),
      ]);

      await expect(service.selectTheme('lead-1')).rejects.toBeInstanceOf(ThemeNotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('allocates configVersion as max+1 within the transaction', async () => {
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      prisma.themeConfiguration.findFirst.mockResolvedValue(null);
      const txCreate = jest.fn().mockResolvedValue(fakeThemeConfigRow({ configVersion: 3 }));
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          themeConfiguration: {
            findFirst: jest.fn().mockResolvedValue({ configVersion: 2 }),
            create: txCreate,
          },
        }),
      );

      await service.selectTheme('lead-1');

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ configVersion: 3 }) }),
      );
    });
  });
});
