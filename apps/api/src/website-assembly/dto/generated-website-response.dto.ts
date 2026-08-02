import type { GeneratedWebsite as GeneratedWebsiteModel } from '@riznexia/db';
import type {
  GeneratedWebsite as GeneratedWebsiteResponse,
  GeneratedWebsiteFile,
} from '@riznexia/shared-types';

// `files` is stored as Json — cast straight through, same convention as
// content-manifest-response.dto.ts/component-manifest-response.dto.ts.
export function toGeneratedWebsiteResponse(
  website: GeneratedWebsiteModel,
): GeneratedWebsiteResponse {
  return {
    id: website.id,
    businessId: website.businessId,
    businessAnalysisId: website.businessAnalysisId,
    themeConfigurationId: website.themeConfigurationId,
    layoutConfigurationId: website.layoutConfigurationId,
    componentManifestId: website.componentManifestId,
    contentManifestId: website.contentManifestId,
    configVersion: website.configVersion,
    assemblyEngineVersion: website.assemblyEngineVersion,
    files: website.files as unknown as GeneratedWebsiteFile[],
    createdAt: website.createdAt.toISOString(),
  };
}
