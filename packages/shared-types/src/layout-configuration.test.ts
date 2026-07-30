import { describe, expect, it } from 'vitest';
import {
  ctaPlacementSchema,
  gridDefinitionSchema,
  layoutConfigurationSchema,
  navigationLayoutSchema,
  pageSectionLayoutSchema,
  sidebarLayoutSchema,
} from './layout-configuration';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    businessId: UUID_B,
    businessAnalysisId: UUID_C,
    themeConfigurationId: UUID_A,
    configVersion: 1,
    layoutEngineVersion: 'v1.0',
    pageStructure: [
      { sectionId: 'hero', order: 1, layoutType: 'full-width' },
      { sectionId: 'menu', order: 2, layoutType: 'grid' },
      { sectionId: 'footer', order: 3, layoutType: 'contained' },
    ],
    navigation: {
      style: 'top-bar-sticky',
      position: 'top',
      sticky: true,
      items: ['menu'],
      mobileBehavior: 'hamburger',
    },
    hero: {
      style: 'full-bleed-image',
      mediaPosition: 'background',
      contentAlignment: 'center',
      ctaSlots: 1,
    },
    footer: {
      style: 'multi-column',
      columns: 4,
      includesNewsletter: false,
      includesSocialLinks: true,
    },
    sidebar: null,
    grid: [{ sectionId: 'menu', columns: { mobile: 1, tablet: 2, desktop: 3 }, gap: 'standard' }],
    responsiveRules: {
      breakpoints: { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 },
      stackedLayout: true,
      tapTargetSizePx: 48,
      perSection: { hero: 'reflow', menu: 'stack', footer: 'reflow' },
    },
    ctaPlacements: [{ ctaText: 'Order Online', zone: 'hero', style: 'solid-button' }],
    componentPlaceholders: [{ componentId: 'menu-showcase', sectionId: 'menu', order: 0 }],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('pageSectionLayoutSchema', () => {
  it('accepts a well-formed entry', () => {
    expect(
      pageSectionLayoutSchema.safeParse({ sectionId: 'hero', order: 1, layoutType: 'full-width' })
        .success,
    ).toBe(true);
  });

  it('rejects a layoutType outside the documented set', () => {
    expect(
      pageSectionLayoutSchema.safeParse({ sectionId: 'hero', order: 1, layoutType: 'split' })
        .success,
    ).toBe(false);
  });
});

describe('navigationLayoutSchema', () => {
  it('accepts a well-formed layout', () => {
    expect(
      navigationLayoutSchema.safeParse({
        style: 'sidebar',
        position: 'side',
        sticky: true,
        items: ['about'],
        mobileBehavior: 'bottom-tab',
      }).success,
    ).toBe(true);
  });

  it('rejects a position outside top/side', () => {
    expect(
      navigationLayoutSchema.safeParse({
        style: 'top-bar',
        position: 'bottom',
        sticky: false,
        items: [],
        mobileBehavior: 'hamburger',
      }).success,
    ).toBe(false);
  });
});

describe('sidebarLayoutSchema', () => {
  it('rejects a position outside left/right', () => {
    expect(
      sidebarLayoutSchema.safeParse({ position: 'center', width: 'standard', sticky: true })
        .success,
    ).toBe(false);
  });
});

describe('gridDefinitionSchema', () => {
  it('rejects a non-positive column count', () => {
    expect(
      gridDefinitionSchema.safeParse({
        sectionId: 'menu',
        columns: { mobile: 0, tablet: 2, desktop: 3 },
        gap: 'standard',
      }).success,
    ).toBe(false);
  });
});

describe('ctaPlacementSchema', () => {
  it('rejects a zone outside the documented set', () => {
    expect(
      ctaPlacementSchema.safeParse({
        ctaText: 'Book Now',
        zone: 'header-banner',
        style: 'solid-button',
      }).success,
    ).toBe(false);
  });
});

describe('layoutConfigurationSchema', () => {
  it('accepts a well-formed configuration', () => {
    expect(layoutConfigurationSchema.safeParse(validConfig()).success).toBe(true);
  });

  it('accepts a null sidebar (non-sidebar navigation styles)', () => {
    expect(layoutConfigurationSchema.safeParse(validConfig({ sidebar: null })).success).toBe(true);
  });

  it('accepts a populated sidebar', () => {
    expect(
      layoutConfigurationSchema.safeParse(
        validConfig({ sidebar: { position: 'left', width: 'standard', sticky: true } }),
      ).success,
    ).toBe(true);
  });

  it('rejects a missing sidebar key (as opposed to null)', () => {
    const { sidebar: _omit, ...rest } = validConfig();
    expect(layoutConfigurationSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an empty pageStructure shape mismatch (wrong entry type)', () => {
    expect(
      layoutConfigurationSchema.safeParse(validConfig({ pageStructure: [{ sectionId: 'hero' }] }))
        .success,
    ).toBe(false);
  });

  it('rejects a missing provenance field', () => {
    const { themeConfigurationId: _omit, ...rest } = validConfig();
    expect(layoutConfigurationSchema.safeParse(rest).success).toBe(false);
  });
});
