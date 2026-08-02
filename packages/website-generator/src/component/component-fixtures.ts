import type {
  BusinessAnalysisOutput,
  LayoutConfiguration,
  ThemeConfiguration,
} from '@riznexia/shared-types';
import { generateLayout } from '../layout/layout-generator';
import { fakeBrandBrief, fakeThemeConfiguration } from '../layout/layout-fixtures';

export { fakeBrandBrief, fakeThemeConfiguration };

// Shared test fixtures for component-generator.test.ts and
// component-validator.test.ts — not itself a test file. Builds a real
// LayoutConfiguration via the actual generateLayout() (not a hand-rolled
// stub) so component-generator tests exercise realistic upstream data.
// Takes the already-constructed brandBrief/theme (not override objects) so
// callers can reuse the exact same theme between generateLayout() and
// generateComponentManifest(), matching how apps/api wires the two phases
// together.
export function fakeLayoutConfiguration(
  brandBrief: BusinessAnalysisOutput = fakeBrandBrief(),
  theme: ThemeConfiguration = fakeThemeConfiguration(),
  overrides: Partial<LayoutConfiguration> = {},
): LayoutConfiguration {
  const content = generateLayout(brandBrief, theme);

  return {
    id: 'layout-config-1',
    businessId: theme.businessId,
    businessAnalysisId: theme.businessAnalysisId,
    themeConfigurationId: theme.id,
    configVersion: 1,
    createdAt: new Date().toISOString(),
    ...content,
    ...overrides,
  };
}
