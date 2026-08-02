import type { PublishReadinessReport as PublishReadinessReportModel } from '@riznexia/db';
import type {
  PublishReadinessReport as PublishReadinessReportResponse,
  ScoreBreakdown,
} from '@riznexia/shared-types';

export function toPublishReadinessReportResponse(
  report: PublishReadinessReportModel,
): PublishReadinessReportResponse {
  return {
    id: report.id,
    businessId: report.businessId,
    generatedWebsiteId: report.generatedWebsiteId,
    previewVersion: report.previewVersion,
    generatedWebsiteVersion: report.generatedWebsiteVersion,
    validationVersion: report.validationVersion,
    generatedByModuleVersion: report.generatedByModuleVersion,
    seoScore: report.seoScore as unknown as ScoreBreakdown,
    accessibilityScore: report.accessibilityScore as unknown as ScoreBreakdown,
    performanceScore: report.performanceScore as unknown as ScoreBreakdown,
    contentCompletenessScore: report.contentCompletenessScore as unknown as ScoreBreakdown,
    structuralIntegrityScore: report.structuralIntegrityScore as unknown as ScoreBreakdown,
    overallPublishScore: report.overallPublishScore as unknown as ScoreBreakdown,
    createdAt: report.createdAt.toISOString(),
  };
}
