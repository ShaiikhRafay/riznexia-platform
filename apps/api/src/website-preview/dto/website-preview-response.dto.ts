import type { WebsitePreview as WebsitePreviewModel } from '@riznexia/db';
import type {
  DevicePreviewPreset,
  PreviewFileEntry,
  WebsitePreview as WebsitePreviewResponse,
} from '@riznexia/shared-types';

// Every compound field is stored as Json — cast straight through, same
// convention as every other *-response.dto.ts in this codebase.
export function toWebsitePreviewResponse(preview: WebsitePreviewModel): WebsitePreviewResponse {
  return {
    id: preview.id,
    businessId: preview.businessId,
    generatedWebsiteId: preview.generatedWebsiteId,
    previewVersion: preview.previewVersion,
    generatedWebsiteVersion: preview.generatedWebsiteVersion,
    validationVersion: preview.validationVersion,
    generatedByModuleVersion: preview.generatedByModuleVersion,
    businessName: preview.businessName,
    themeName: preview.themeName,
    themeId: preview.themeId,
    devicePresets: preview.devicePresets as unknown as DevicePreviewPreset[],
    files: preview.files as unknown as PreviewFileEntry[],
    createdAt: preview.createdAt.toISOString(),
  };
}
