import type { PreviewReport as PreviewReportModel } from '@riznexia/db';
import type {
  PreviewReport as PreviewReportResponse,
  ValidationRuleResult,
} from '@riznexia/shared-types';

export function toPreviewReportResponse(report: PreviewReportModel): PreviewReportResponse {
  return {
    id: report.id,
    businessId: report.businessId,
    generatedWebsiteId: report.generatedWebsiteId,
    previewVersion: report.previewVersion,
    generatedWebsiteVersion: report.generatedWebsiteVersion,
    validationVersion: report.validationVersion,
    generatedByModuleVersion: report.generatedByModuleVersion,
    rules: report.rules as unknown as ValidationRuleResult[],
    validationTimestamp: report.validationTimestamp.toISOString(),
    createdAt: report.createdAt.toISOString(),
  };
}
