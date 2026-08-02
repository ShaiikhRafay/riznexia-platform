import type {
  BusinessAnalysisOutput,
  ComponentManifest,
  LayoutConfiguration,
  ThemeConfiguration,
} from '@riznexia/shared-types';
import {
  fakeBrandBrief,
  fakeLayoutConfiguration,
  fakeThemeConfiguration,
} from '../component/component-fixtures';
import { fakeBusinessContactInfo, fakeComponentManifest } from '../content/content-fixtures';
import { generateContentManifest } from '../content/content-generator';
import type { AssembleWebsiteInput } from './website-assembler';

// Shared test fixture for the assembly engine's own tests — builds a full,
// realistic five-manifest pipeline by running the actual M8.1/M8.2/M8.3
// generators (not hand-rolled stubs), same technique content-fixtures.ts
// and component-fixtures.ts already use for their own upstream inputs.
export function fakeAssembleWebsiteInput(
  overrides: {
    brandBrief?: BusinessAnalysisOutput;
    theme?: ThemeConfiguration;
    layout?: LayoutConfiguration;
    componentManifest?: ComponentManifest;
  } = {},
): AssembleWebsiteInput {
  const brandBrief = overrides.brandBrief ?? fakeBrandBrief();
  const theme = overrides.theme ?? fakeThemeConfiguration();
  const layout = overrides.layout ?? fakeLayoutConfiguration(brandBrief, theme);
  const componentManifest =
    overrides.componentManifest ?? fakeComponentManifest(brandBrief, theme, layout);
  const business = fakeBusinessContactInfo();

  const contentManifestContent = generateContentManifest(
    brandBrief,
    business,
    theme,
    layout,
    componentManifest,
  );

  return {
    themeConfiguration: theme,
    layoutConfiguration: layout,
    componentManifest,
    contentManifest: {
      id: 'content-manifest-1',
      businessId: theme.businessId,
      businessAnalysisId: theme.businessAnalysisId,
      themeConfigurationId: theme.id,
      layoutConfigurationId: layout.id,
      componentManifestId: componentManifest.id,
      configVersion: 1,
      createdAt: new Date().toISOString(),
      ...contentManifestContent,
    },
  };
}
