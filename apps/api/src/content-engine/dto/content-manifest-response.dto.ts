import type { ContentManifest as ContentManifestModel } from '@riznexia/db';
import type {
  ComponentContentBinding,
  ContentManifest as ContentManifestResponse,
  SeoMetadata,
  StructuredDataBinding,
  UnresolvedBinding,
} from '@riznexia/shared-types';

// Every compound field is stored as Json — cast straight through, same
// convention as layout-configuration-response.dto.ts/component-manifest-response.dto.ts.
export function toContentManifestResponse(manifest: ContentManifestModel): ContentManifestResponse {
  return {
    id: manifest.id,
    businessId: manifest.businessId,
    businessAnalysisId: manifest.businessAnalysisId,
    themeConfigurationId: manifest.themeConfigurationId,
    layoutConfigurationId: manifest.layoutConfigurationId,
    componentManifestId: manifest.componentManifestId,
    configVersion: manifest.configVersion,
    contentEngineVersion: manifest.contentEngineVersion,

    componentContent: manifest.componentContent as unknown as ComponentContentBinding[],
    unresolvedBindings: manifest.unresolvedBindings as unknown as UnresolvedBinding[],
    seoMetadata: manifest.seoMetadata as unknown as SeoMetadata,
    structuredData: manifest.structuredData as unknown as StructuredDataBinding[],

    createdAt: manifest.createdAt.toISOString(),
  };
}
