import { AiProviderName, AnalysisStatus as PrismaAnalysisStatus } from '@riznexia/db';
import type { BusinessAnalysis as BusinessAnalysisModel } from '@riznexia/db';
import type {
  AiProvider,
  AnalysisStatus,
  BusinessAnalysis as BusinessAnalysisResponse,
  BusinessAnalysisOutput,
} from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split used throughout
// (place-sync-job-response.dto.ts, lead.mapper.ts).
const PRISMA_TO_API_STATUS: Record<PrismaAnalysisStatus, AnalysisStatus> = {
  [PrismaAnalysisStatus.PENDING]: 'pending',
  [PrismaAnalysisStatus.COMPLETED]: 'completed',
  [PrismaAnalysisStatus.FAILED]: 'failed',
};

const PRISMA_TO_API_PROVIDER: Record<AiProviderName, AiProvider> = {
  [AiProviderName.CLAUDE]: 'claude',
  [AiProviderName.OPENAI]: 'openai',
  [AiProviderName.GEMINI]: 'gemini',
  [AiProviderName.DEEPSEEK]: 'deepseek',
  [AiProviderName.LOCAL_LLM]: 'local_llm',
};

export function toBusinessAnalysisResponse(
  analysis: BusinessAnalysisModel,
): BusinessAnalysisResponse {
  return {
    id: analysis.id,
    businessId: analysis.businessId,
    analysisVersion: analysis.analysisVersion,
    promptName: analysis.promptName,
    promptVersion: analysis.promptVersion,
    aiProvider: PRISMA_TO_API_PROVIDER[analysis.aiProvider],
    aiModel: analysis.aiModel,
    status: PRISMA_TO_API_STATUS[analysis.status],
    brandBrief: analysis.brandBrief as BusinessAnalysisOutput | null,
    confidenceScore: analysis.confidenceScore,
    validationErrors: analysis.validationErrors as string[] | null,
    executionTimeMs: analysis.executionTimeMs,
    completedAt: analysis.completedAt === null ? null : analysis.completedAt.toISOString(),
    promptTokens: analysis.promptTokens,
    completionTokens: analysis.completionTokens,
    totalTokens: analysis.totalTokens,
    estimatedCost: analysis.estimatedCost === null ? null : Number(analysis.estimatedCost),
    createdAt: analysis.createdAt.toISOString(),
  };
}
