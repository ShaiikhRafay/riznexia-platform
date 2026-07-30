import {
  AiProviderName,
  AnalysisStatus as PrismaAnalysisStatus,
  BusinessOperatingStatus,
  BusinessSourceProvider,
  WebsiteStatusType,
} from '@riznexia/db';
import type { Business, PrismaClient } from '@riznexia/db';
import type { Lead } from '@riznexia/shared-types';
import {
  BusinessNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import type { BusinessService } from '../business/business.service';
import type { LeadsService } from '../leads/leads.service';
import type { BusinessAnalysisRunnerService } from './business-analysis-runner.service';
import { BusinessAnalysisService } from './business-analysis.service';
import { computeBusinessFingerprint } from './business-fingerprint';

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

function fakeAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    id: 'analysis-1',
    businessId: 'business-1',
    analysisVersion: 1,
    promptName: 'business_analysis',
    promptVersion: 'v1.0',
    promptHash: 'hash-abc',
    aiProvider: AiProviderName.CLAUDE,
    aiModel: 'claude-sonnet-5',
    inputHash: 'input-hash-1',
    status: PrismaAnalysisStatus.COMPLETED,
    brandBrief: { industry: 'Restaurant' },
    sentimentSummary: null,
    confidenceScore: 0.85,
    rawResponse: null,
    validationErrors: null,
    executionTimeMs: 4000,
    completedAt: new Date(),
    promptTokens: 500,
    completionTokens: 300,
    totalTokens: 800,
    estimatedCost: 0.02,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('BusinessAnalysisService', () => {
  let prisma: { businessAnalysis: { findFirst: jest.Mock }; $transaction: jest.Mock };
  let leadsService: { findById: jest.Mock };
  let businessService: { findById: jest.Mock };
  let runner: { run: jest.Mock };
  let service: BusinessAnalysisService;

  beforeEach(() => {
    prisma = {
      businessAnalysis: { findFirst: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          businessAnalysis: { findFirst: prisma.businessAnalysis.findFirst, create: jest.fn() },
        }),
      ),
    };
    leadsService = { findById: jest.fn() };
    businessService = { findById: jest.fn() };
    runner = { run: jest.fn().mockResolvedValue(undefined) };

    service = new BusinessAnalysisService(
      prisma as unknown as PrismaClient,
      leadsService as unknown as LeadsService,
      businessService as unknown as BusinessService,
      runner as unknown as BusinessAnalysisRunnerService,
    );
  });

  describe('findLatestForLead', () => {
    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.findLatestForLead('missing')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('returns null when the lead exists but has no analysis yet', async () => {
      leadsService.findById.mockResolvedValue(fakeLead());
      prisma.businessAnalysis.findFirst.mockResolvedValue(null);
      const result = await service.findLatestForLead('lead-1');
      expect(result).toBeNull();
    });

    it('returns the latest analysis, mapped to the API shape', async () => {
      leadsService.findById.mockResolvedValue(fakeLead());
      prisma.businessAnalysis.findFirst.mockResolvedValue(fakeAnalysis());
      const result = await service.findLatestForLead('lead-1');
      expect(result).toMatchObject({ id: 'analysis-1', status: 'completed', aiProvider: 'claude' });
    });
  });

  describe('triggerAnalysis', () => {
    beforeEach(() => {
      leadsService.findById.mockResolvedValue(fakeLead());
    });

    it('throws LeadNotFoundException when the lead does not exist', async () => {
      leadsService.findById.mockResolvedValue(null);
      await expect(service.triggerAnalysis('missing')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
    });

    it('throws BusinessNotFoundException when the business is missing', async () => {
      businessService.findById.mockResolvedValue(null);
      await expect(service.triggerAnalysis('lead-1')).rejects.toBeInstanceOf(
        BusinessNotFoundException,
      );
    });

    it('returns cacheHit:true and does not dispatch the runner when the fingerprint matches the latest completed analysis', async () => {
      const business = fakeBusiness();
      businessService.findById.mockResolvedValue(business);
      const matchingHash = computeBusinessFingerprint(business);
      prisma.businessAnalysis.findFirst.mockResolvedValue(
        fakeAnalysis({ inputHash: matchingHash }),
      );

      const result = await service.triggerAnalysis('lead-1');

      expect(result.cacheHit).toBe(true);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(runner.run).not.toHaveBeenCalled();
    });

    it('creates a PENDING row and dispatches the runner fire-and-forget on a fingerprint mismatch (cache miss)', async () => {
      const business = fakeBusiness({ syncVersion: 2 });
      businessService.findById.mockResolvedValue(business);
      // Latest completed analysis has a stale inputHash — business changed since.
      prisma.businessAnalysis.findFirst.mockResolvedValue(
        fakeAnalysis({ inputHash: 'stale-hash', analysisVersion: 3 }),
      );

      const created = fakeAnalysis({
        id: 'analysis-2',
        status: PrismaAnalysisStatus.PENDING,
        analysisVersion: 4,
      });
      const txCreate = jest.fn().mockResolvedValue(created);
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          businessAnalysis: {
            findFirst: jest.fn().mockResolvedValue({ analysisVersion: 3 }),
            create: txCreate,
          },
        }),
      );

      const result = await service.triggerAnalysis('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: 'business-1',
            analysisVersion: 4,
            status: PrismaAnalysisStatus.PENDING,
          }),
        }),
      );
      expect(runner.run).toHaveBeenCalledWith('analysis-2');
    });

    it('treats no prior completed analysis as a cache miss', async () => {
      const business = fakeBusiness();
      businessService.findById.mockResolvedValue(business);
      prisma.businessAnalysis.findFirst.mockResolvedValue(null);

      const created = fakeAnalysis({
        id: 'analysis-3',
        status: PrismaAnalysisStatus.PENDING,
        analysisVersion: 1,
      });
      const txCreate = jest.fn().mockResolvedValue(created);
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          businessAnalysis: { findFirst: jest.fn().mockResolvedValue(null), create: txCreate },
        }),
      );

      const result = await service.triggerAnalysis('lead-1');

      expect(result.cacheHit).toBe(false);
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ analysisVersion: 1 }) }),
      );
    });

    it('dispatches the runner without awaiting it (fire-and-forget)', async () => {
      const business = fakeBusiness();
      businessService.findById.mockResolvedValue(business);
      prisma.businessAnalysis.findFirst.mockResolvedValue(null);

      const created = fakeAnalysis({ id: 'analysis-4', status: PrismaAnalysisStatus.PENDING });
      prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback({
          businessAnalysis: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(created),
          },
        }),
      );
      let resolveRun: () => void = () => {};
      runner.run.mockReturnValue(new Promise<void>((resolve) => (resolveRun = resolve)));

      await service.triggerAnalysis('lead-1');

      expect(runner.run).toHaveBeenCalledWith('analysis-4');
      resolveRun();
    });
  });
});
