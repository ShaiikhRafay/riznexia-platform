import {
  AnalysisStatus as PrismaAnalysisStatus,
  BusinessOperatingStatus,
  BusinessSourceProvider,
  WebsiteStatusType,
} from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import { ESCALATION_MODEL, STANDARD_MODEL, type AiService } from '@riznexia/ai';
import { QuotaExceededException } from '../common/exceptions/app.exception';
import type { CostService } from '../common/cost/cost.service';
import { BusinessAnalysisRunnerService } from './business-analysis-runner.service';

function fakePendingAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    id: 'analysis-1',
    businessId: 'business-1',
    analysisVersion: 1,
    status: PrismaAnalysisStatus.PENDING,
    business: {
      id: 'business-1',
      businessName: "Joe's Diner",
      category: 'restaurant',
      city: 'Karachi',
      address: '123 Main St',
      phone: null,
      rating: 4.5,
      reviewCount: 120,
      openingHours: null,
      photos: null,
      websiteStatus: WebsiteStatusType.NONE,
      googleBusinessUrl: null,
      placesData: {},
      businessStatus: BusinessOperatingStatus.OPERATIONAL,
      sourceProvider: BusinessSourceProvider.GOOGLE,
      syncVersion: 1,
    },
    ...overrides,
  };
}

describe('BusinessAnalysisRunnerService', () => {
  let prisma: { businessAnalysis: { findUniqueOrThrow: jest.Mock; update: jest.Mock } };
  let aiService: { analyzeBusiness: jest.Mock };
  let costService: { charge: jest.Mock };
  let runner: BusinessAnalysisRunnerService;

  beforeEach(() => {
    prisma = {
      businessAnalysis: { findUniqueOrThrow: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    };
    aiService = { analyzeBusiness: jest.fn() };
    costService = { charge: jest.fn().mockResolvedValue(undefined) };
    runner = new BusinessAnalysisRunnerService(
      aiService as unknown as AiService,
      costService as unknown as CostService,
      prisma as unknown as PrismaClient,
    );
  });

  it('persists a COMPLETED analysis on success, with token/cost/model fields set', async () => {
    prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakePendingAnalysis());
    aiService.analyzeBusiness.mockResolvedValue({
      status: 'completed',
      brandBrief: { industry: 'Restaurant' },
      confidenceScore: 0.85,
      promptName: 'business_analysis',
      promptVersion: 'v1.0',
      promptHash: 'hash-abc',
      aiProvider: 'CLAUDE',
      aiModel: STANDARD_MODEL,
      promptTokens: 500,
      completionTokens: 300,
      totalTokens: 800,
      executionTimeMs: 4000,
    });

    await runner.run('analysis-1');

    expect(costService.charge).toHaveBeenCalledWith(
      'ai_business_analysis',
      expect.any(Number),
      expect.objectContaining({ businessId: 'business-1', analysisId: 'analysis-1' }),
    );
    expect(prisma.businessAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'analysis-1' },
        data: expect.objectContaining({
          status: PrismaAnalysisStatus.COMPLETED,
          brandBrief: { industry: 'Restaurant' },
          confidenceScore: 0.85,
          aiModel: STANDARD_MODEL,
          promptTokens: 500,
          completionTokens: 300,
          totalTokens: 800,
        }),
      }),
    );
    const data = prisma.businessAnalysis.update.mock.calls[0]![0].data;
    expect(data.estimatedCost).toBeGreaterThan(0);
    expect(data.completedAt).toBeInstanceOf(Date);
  });

  it('computes a higher estimatedCost on the escalation model than the standard model for equal token counts', async () => {
    prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakePendingAnalysis());

    aiService.analyzeBusiness.mockResolvedValue({
      status: 'completed',
      brandBrief: {},
      confidenceScore: 0.5,
      promptName: 'business_analysis',
      promptVersion: 'v1.0',
      promptHash: 'hash',
      aiProvider: 'CLAUDE',
      aiModel: STANDARD_MODEL,
      promptTokens: 1000,
      completionTokens: 1000,
      totalTokens: 2000,
      executionTimeMs: 1000,
    });
    await runner.run('analysis-1');
    const standardCost = prisma.businessAnalysis.update.mock.calls[0]![0].data.estimatedCost;

    prisma.businessAnalysis.update.mockClear();
    aiService.analyzeBusiness.mockResolvedValue({
      status: 'completed',
      brandBrief: {},
      confidenceScore: 0.5,
      promptName: 'business_analysis',
      promptVersion: 'v1.0',
      promptHash: 'hash',
      aiProvider: 'CLAUDE',
      aiModel: ESCALATION_MODEL,
      promptTokens: 1000,
      completionTokens: 1000,
      totalTokens: 2000,
      executionTimeMs: 1000,
    });
    await runner.run('analysis-1');
    const escalationCost = prisma.businessAnalysis.update.mock.calls[0]![0].data.estimatedCost;

    expect(escalationCost).toBeGreaterThan(standardCost);
  });

  it('persists a FAILED analysis with rawResponse and validationErrors when the AI response never validates', async () => {
    prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakePendingAnalysis());
    aiService.analyzeBusiness.mockResolvedValue({
      status: 'failed',
      rawResponse: 'not valid json',
      validationErrors: ['industry: Required'],
      promptName: 'business_analysis',
      promptVersion: 'v1.0',
      promptHash: 'hash-abc',
      aiProvider: 'CLAUDE',
      aiModel: ESCALATION_MODEL,
      promptTokens: 900,
      completionTokens: 600,
      totalTokens: 1500,
      executionTimeMs: 9000,
    });

    await runner.run('analysis-1');

    expect(prisma.businessAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PrismaAnalysisStatus.FAILED,
          rawResponse: 'not valid json',
          validationErrors: ['industry: Required'],
        }),
      }),
    );
  });

  it('truncates an oversized rawResponse to 64KB before persisting a FAILED analysis', async () => {
    prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakePendingAnalysis());
    const oversized = 'x'.repeat(100_000);
    aiService.analyzeBusiness.mockResolvedValue({
      status: 'failed',
      rawResponse: oversized,
      validationErrors: ['too long'],
      promptName: 'business_analysis',
      promptVersion: 'v1.0',
      promptHash: 'hash',
      aiProvider: 'CLAUDE',
      aiModel: STANDARD_MODEL,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      executionTimeMs: 1,
    });

    await runner.run('analysis-1');

    const data = prisma.businessAnalysis.update.mock.calls[0]![0].data;
    expect((data.rawResponse as string).length).toBe(65_536);
  });

  it('marks the analysis FAILED without calling the AI provider when the monthly cost ceiling is already reached', async () => {
    prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakePendingAnalysis());
    costService.charge.mockRejectedValue(new QuotaExceededException());

    await runner.run('analysis-1');

    expect(aiService.analyzeBusiness).not.toHaveBeenCalled();
    expect(prisma.businessAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PrismaAnalysisStatus.FAILED }),
      }),
    );
  });

  it('marks the analysis FAILED when the AI provider throws an unrecoverable error', async () => {
    prisma.businessAnalysis.findUniqueOrThrow.mockResolvedValue(fakePendingAnalysis());
    aiService.analyzeBusiness.mockRejectedValue(new Error('upstream exhausted'));

    await runner.run('analysis-1');

    expect(prisma.businessAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PrismaAnalysisStatus.FAILED,
          validationErrors: ['upstream exhausted'],
        }),
      }),
    );
  });
});
