import { describe, expect, it } from 'vitest';
import { generateLayout, LAYOUT_ENGINE_VERSION } from './layout-generator';
import { fakeBrandBrief, fakeThemeConfiguration } from './layout-fixtures';

describe('generateLayout', () => {
  it('is deterministic — identical input produces byte-identical output, repeatedly', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const first = generateLayout(brandBrief, theme);
    const second = generateLayout(brandBrief, theme);
    const third = generateLayout(brandBrief, theme);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('stamps the current layout engine version', () => {
    const result = generateLayout(fakeBrandBrief(), fakeThemeConfiguration());
    expect(result.layoutEngineVersion).toBe(LAYOUT_ENGINE_VERSION);
  });

  it('pageStructure mirrors sectionOrder 1:1 — hero is full-width, sections with a mapped component are grid, the rest are contained', () => {
    const result = generateLayout(fakeBrandBrief(), fakeThemeConfiguration());
    expect(result.pageStructure.map((s) => s.sectionId)).toEqual([
      'hero',
      'about',
      'menu',
      'gallery',
      'testimonials',
      'reservation-cta',
      'contact',
      'footer',
    ]);
    expect(result.pageStructure.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.pageStructure.find((s) => s.sectionId === 'hero')?.layoutType).toBe('full-width');
    expect(result.pageStructure.find((s) => s.sectionId === 'menu')?.layoutType).toBe('grid');
    expect(result.pageStructure.find((s) => s.sectionId === 'about')?.layoutType).toBe('contained');
    expect(result.pageStructure.find((s) => s.sectionId === 'footer')?.layoutType).toBe(
      'contained',
    );
  });

  it('navigation excludes the first (hero) and last (footer) sections and carries the theme style verbatim', () => {
    const result = generateLayout(fakeBrandBrief(), fakeThemeConfiguration());
    expect(result.navigation.items).toEqual([
      'about',
      'menu',
      'gallery',
      'testimonials',
      'reservation-cta',
      'contact',
    ]);
    expect(result.navigation.style).toBe('top-bar-sticky');
    expect(result.navigation.sticky).toBe(true);
    expect(result.navigation.position).toBe('top');
    expect(result.navigation.mobileBehavior).toBe('hamburger');
  });

  it('navigation position is "side" and sidebar is populated when navigationStyle is "sidebar"', () => {
    const theme = fakeThemeConfiguration({ navigationStyle: 'sidebar' });
    const result = generateLayout(fakeBrandBrief(), theme);
    expect(result.navigation.position).toBe('side');
    expect(result.navigation.sticky).toBe(false);
    expect(result.sidebar).toEqual({ position: 'left', width: 'standard', sticky: true });
  });

  it('sidebar stays null for every non-sidebar navigation style', () => {
    for (const navigationStyle of ['top-bar', 'top-bar-sticky', 'minimal-hamburger'] as const) {
      const result = generateLayout(fakeBrandBrief(), fakeThemeConfiguration({ navigationStyle }));
      expect(result.sidebar).toBeNull();
    }
  });

  it('hero mediaPosition/contentAlignment are looked up from heroStyle', () => {
    expect(
      generateLayout(fakeBrandBrief(), fakeThemeConfiguration({ heroStyle: 'split-image-text' }))
        .hero,
    ).toMatchObject({
      mediaPosition: 'right',
      contentAlignment: 'left',
    });
    expect(
      generateLayout(fakeBrandBrief(), fakeThemeConfiguration({ heroStyle: 'minimal-text' })).hero,
    ).toMatchObject({
      mediaPosition: 'none',
      contentAlignment: 'center',
    });
  });

  it('hero ctaSlots is the ctaRecommendations count, capped at 2', () => {
    expect(
      generateLayout(fakeBrandBrief({ ctaRecommendations: ['A'] }), fakeThemeConfiguration()).hero
        .ctaSlots,
    ).toBe(1);
    expect(
      generateLayout(
        fakeBrandBrief({ ctaRecommendations: ['A', 'B', 'C'] }),
        fakeThemeConfiguration(),
      ).hero.ctaSlots,
    ).toBe(2);
  });

  it('footer columns/newsletter derive from footerStyle', () => {
    expect(
      generateLayout(fakeBrandBrief(), fakeThemeConfiguration({ footerStyle: 'newsletter-cta' }))
        .footer,
    ).toMatchObject({
      columns: 2,
      includesNewsletter: true,
    });
    expect(
      generateLayout(fakeBrandBrief(), fakeThemeConfiguration({ footerStyle: 'simple-centered' }))
        .footer,
    ).toMatchObject({
      columns: 1,
      includesNewsletter: false,
    });
  });

  it('footer includesSocialLinks tracks whether socialProofSuggestions is non-empty', () => {
    expect(
      generateLayout(fakeBrandBrief({ socialProofSuggestions: [] }), fakeThemeConfiguration())
        .footer.includesSocialLinks,
    ).toBe(false);
    expect(
      generateLayout(
        fakeBrandBrief({ socialProofSuggestions: ['reviews'] }),
        fakeThemeConfiguration(),
      ).footer.includesSocialLinks,
    ).toBe(true);
  });

  it('grid definitions cover every non-hero section with a mapped component, with gap derived from animationLevel', () => {
    const result = generateLayout(
      fakeBrandBrief(),
      fakeThemeConfiguration({ animationLevel: 'expressive' }),
    );
    expect(result.grid.map((g) => g.sectionId).sort()).toEqual(
      ['menu', 'gallery', 'testimonials', 'reservation-cta', 'contact'].sort(),
    );
    expect(result.grid.every((g) => g.gap === 'spacious')).toBe(true);
    expect(
      result.grid.every(
        (g) => g.columns.mobile === 1 && g.columns.tablet === 2 && g.columns.desktop === 3,
      ),
    ).toBe(true);
  });

  it('gap tracks animationLevel across the full lookup table', () => {
    expect(
      generateLayout(fakeBrandBrief(), fakeThemeConfiguration({ animationLevel: 'none' })).grid[0]
        ?.gap,
    ).toBe('compact');
    expect(
      generateLayout(fakeBrandBrief(), fakeThemeConfiguration({ animationLevel: 'subtle' })).grid[0]
        ?.gap,
    ).toBe('compact');
    expect(
      generateLayout(fakeBrandBrief(), fakeThemeConfiguration({ animationLevel: 'moderate' }))
        .grid[0]?.gap,
    ).toBe('standard');
  });

  it('responsiveRules.perSection marks grid+stacked sections "stack", everything else "reflow"', () => {
    const result = generateLayout(fakeBrandBrief(), fakeThemeConfiguration());
    expect(result.responsiveRules.perSection.menu).toBe('stack');
    expect(result.responsiveRules.perSection.about).toBe('reflow');
    expect(result.responsiveRules.perSection.hero).toBe('reflow');
  });

  it('responsiveRules.perSection is "reflow" everywhere when stackedLayout is false, even for grid sections', () => {
    const theme = fakeThemeConfiguration({
      mobilePreferences: {
        navigationPattern: 'hamburger',
        stackedLayout: false,
        tapTargetSizePx: 48,
      },
    });
    const result = generateLayout(fakeBrandBrief(), theme);
    expect(result.responsiveRules.perSection.menu).toBe('reflow');
    expect(result.responsiveRules.stackedLayout).toBe(false);
  });

  it('responsiveRules carries fixed breakpoints and pass-through mobile preferences', () => {
    const result = generateLayout(fakeBrandBrief(), fakeThemeConfiguration());
    expect(result.responsiveRules.breakpoints).toEqual({
      mobile: 0,
      tablet: 768,
      desktop: 1024,
      wide: 1440,
    });
    expect(result.responsiveRules.tapTargetSizePx).toBe(48);
  });

  it('ctaPlacements are capped at 3, zoned hero/section-end/footer, styled from ctaStyle', () => {
    const result = generateLayout(
      fakeBrandBrief({ ctaRecommendations: ['A', 'B', 'C', 'D'] }),
      fakeThemeConfiguration(),
    );
    expect(result.ctaPlacements).toHaveLength(3);
    expect(result.ctaPlacements.map((c) => c.ctaText)).toEqual(['A', 'B', 'C']);
    expect(result.ctaPlacements.map((c) => c.zone)).toEqual(['hero', 'section-end', 'footer']);
    expect(result.ctaPlacements.every((c) => c.style === 'solid-button')).toBe(true);
  });

  it('the second cta placement zones as sticky-header when ctaStyle is floating-action', () => {
    const result = generateLayout(
      fakeBrandBrief({ ctaRecommendations: ['A', 'B'] }),
      fakeThemeConfiguration({ ctaStyle: 'floating-action' }),
    );
    expect(result.ctaPlacements[1]?.zone).toBe('sticky-header');
  });

  it('componentPlaceholders flatten sectionComponentMap in sectionOrder order, covering every componentSet entry exactly once', () => {
    const theme = fakeThemeConfiguration();
    const result = generateLayout(fakeBrandBrief(), theme);
    expect(result.componentPlaceholders.map((p) => p.componentId).sort()).toEqual(
      [...theme.componentSet].sort(),
    );
    expect(result.componentPlaceholders.map((p) => p.sectionId)).toEqual([
      'hero',
      'menu',
      'gallery',
      'testimonials',
      'reservation-cta',
      'contact',
    ]);
  });
});
