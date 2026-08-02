import type {
  BusinessAnalysisOutput,
  BusinessContactInfo,
  ComponentManifest,
  LayoutConfiguration,
  ThemeConfiguration,
} from '@riznexia/shared-types';
import { generateComponentManifest } from '../component/component-generator';
import {
  fakeBrandBrief,
  fakeLayoutConfiguration,
  fakeThemeConfiguration,
} from '../component/component-fixtures';

export { fakeBrandBrief, fakeLayoutConfiguration, fakeThemeConfiguration };

// Shared test fixtures for content-generator.test.ts and
// content-validator.test.ts — not itself a test file.
export function fakeBusinessContactInfo(
  overrides: Partial<BusinessContactInfo> = {},
): BusinessContactInfo {
  return {
    businessName: "Joe's Diner",
    address: '123 Main St',
    city: 'Karachi',
    phone: '+92 300 1234567',
    photos: [{ photoReference: 'photo-ref-1' }],
    openingHours: { weekdayText: ['Mon-Sun: 9:00 AM - 11:00 PM'] },
    rating: 4.5,
    reviewCount: 120,
    googleBusinessUrl: 'https://maps.google.com/?cid=12345',
    latitude: 24.8607,
    longitude: 67.0011,
    ...overrides,
  };
}

// Builds a real ComponentManifest via the actual generateComponentManifest()
// (not a hand-rolled stub) so content-generator tests exercise realistic
// upstream data — same technique component-fixtures.ts uses for LayoutConfiguration.
export function fakeComponentManifest(
  brandBrief: BusinessAnalysisOutput = fakeBrandBrief(),
  theme: ThemeConfiguration = fakeThemeConfiguration(),
  layout: LayoutConfiguration = fakeLayoutConfiguration(brandBrief, theme),
  overrides: Partial<ComponentManifest> = {},
): ComponentManifest {
  const content = generateComponentManifest(brandBrief, theme, layout);

  return {
    id: 'component-manifest-1',
    businessId: theme.businessId,
    businessAnalysisId: theme.businessAnalysisId,
    themeConfigurationId: theme.id,
    layoutConfigurationId: layout.id,
    configVersion: 1,
    createdAt: new Date().toISOString(),
    ...content,
    ...overrides,
  };
}
