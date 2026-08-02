import type { ComponentManifest as ComponentManifestModel } from '@riznexia/db';
import type {
  ComponentDefinition,
  ComponentManifest as ComponentManifestResponse,
  ThemeTokens,
} from '@riznexia/shared-types';

// Every compound field is stored as Json — cast straight through, same
// convention as layout-configuration-response.dto.ts.
export function toComponentManifestResponse(
  manifest: ComponentManifestModel,
): ComponentManifestResponse {
  return {
    id: manifest.id,
    businessId: manifest.businessId,
    businessAnalysisId: manifest.businessAnalysisId,
    themeConfigurationId: manifest.themeConfigurationId,
    layoutConfigurationId: manifest.layoutConfigurationId,
    configVersion: manifest.configVersion,
    componentEngineVersion: manifest.componentEngineVersion,

    themeTokens: manifest.themeTokens as unknown as ThemeTokens,
    components: manifest.components as unknown as ComponentDefinition[],

    createdAt: manifest.createdAt.toISOString(),
  };
}
