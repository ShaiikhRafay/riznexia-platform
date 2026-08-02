import { describe, expect, it } from 'vitest';
import { generateComponentManifest, COMPONENT_ENGINE_VERSION } from './component-generator';
import { computeThemeTokens } from './component-tokens';
import {
  fakeBrandBrief,
  fakeLayoutConfiguration,
  fakeThemeConfiguration,
} from './component-fixtures';

describe('generateComponentManifest', () => {
  it('is deterministic — identical input produces byte-identical output, repeatedly', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);

    const first = generateComponentManifest(brandBrief, theme, layout);
    const second = generateComponentManifest(brandBrief, theme, layout);
    const third = generateComponentManifest(brandBrief, theme, layout);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('stamps the current component engine version', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const result = generateComponentManifest(
      brandBrief,
      theme,
      fakeLayoutConfiguration(brandBrief, theme),
    );
    expect(result.componentEngineVersion).toBe(COMPONENT_ENGINE_VERSION);
  });

  it('computes themeTokens identically to computeThemeTokens()', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const result = generateComponentManifest(
      brandBrief,
      theme,
      fakeLayoutConfiguration(brandBrief, theme),
    );
    expect(result.themeTokens).toEqual(computeThemeTokens(theme));
  });

  it('includes exactly one root-level navigation component', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const result = generateComponentManifest(
      brandBrief,
      theme,
      fakeLayoutConfiguration(brandBrief, theme),
    );
    const navComponents = result.components.filter((c) => c.componentType === 'navigation');
    expect(navComponents).toHaveLength(1);
    expect(navComponents[0]?.parentComponentId).toBeNull();
    expect(navComponents[0]?.componentId).toBe('navigation');
  });

  it('creates one section wrapper component per pageStructure entry, root-level', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const result = generateComponentManifest(brandBrief, theme, layout);

    const sectionComponents = result.components.filter((c) => c.componentType === 'section');
    expect(sectionComponents.map((c) => c.componentId)).toEqual(
      layout.pageStructure.map((s) => `section-${s.sectionId}`),
    );
    expect(sectionComponents.every((c) => c.parentComponentId === null)).toBe(true);
  });

  it('assigns each mapped theme component as a child of its section, with the correct classified componentType', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const result = generateComponentManifest(brandBrief, theme, layout);

    const menuShowcase = result.components.find((c) => c.componentId === 'menu-showcase');
    expect(menuShowcase).toMatchObject({
      componentType: 'menu-list',
      parentComponentId: 'section-menu',
    });

    const gallery = result.components.find((c) => c.componentId === 'gallery-grid');
    expect(gallery).toMatchObject({
      componentType: 'card-grid',
      parentComponentId: 'section-gallery',
    });

    const carousel = result.components.find((c) => c.componentId === 'testimonial-carousel');
    expect(carousel).toMatchObject({
      componentType: 'carousel',
      parentComponentId: 'section-testimonials',
    });

    const cta = result.components.find((c) => c.componentId === 'reservation-cta');
    expect(cta).toMatchObject({
      componentType: 'cta-banner',
      parentComponentId: 'section-reservation-cta',
    });

    const menuSection = result.components.find((c) => c.componentId === 'section-menu');
    expect(menuSection?.childComponentIds).toEqual(['menu-showcase']);

    const aboutSection = result.components.find((c) => c.componentId === 'section-about');
    expect(aboutSection?.childComponentIds).toEqual([]);
  });

  it('omits the sidebar component when navigationStyle is not "sidebar"', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration({ navigationStyle: 'top-bar-sticky' });
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const result = generateComponentManifest(brandBrief, theme, layout);
    expect(result.components.some((c) => c.componentType === 'sidebar')).toBe(false);
  });

  it('includes a conditionally-visible sidebar component when navigationStyle is "sidebar"', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration({ navigationStyle: 'sidebar' });
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const result = generateComponentManifest(brandBrief, theme, layout);
    const sidebar = result.components.find((c) => c.componentType === 'sidebar');
    expect(sidebar).toBeDefined();
    expect(sidebar?.visibility).toEqual({ mode: 'conditional', condition: 'sidebar-present' });
    expect(sidebar?.parentComponentId).toBeNull();
  });

  it('adds an optional trustSignal slot to the hero when trustSignals is non-empty', () => {
    const brandBrief = fakeBrandBrief({ trustSignals: ['BBB Accredited'] });
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const result = generateComponentManifest(brandBrief, theme, layout);
    const hero = result.components.find((c) => c.componentId === 'hero-banner');
    expect(hero?.optionalContent.map((slot) => slot.slotName)).toContain('trustSignal');
  });

  it('does not add a trustSignal slot to the hero when trustSignals is empty', () => {
    const brandBrief = fakeBrandBrief({ trustSignals: [] });
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const result = generateComponentManifest(brandBrief, theme, layout);
    const hero = result.components.find((c) => c.componentId === 'hero-banner');
    expect(hero?.optionalContent.map((slot) => slot.slotName)).not.toContain('trustSignal');
  });

  it('derives placeholder labels deterministically from slotName (camelCase -> Title Case, bracketed)', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const result = generateComponentManifest(
      brandBrief,
      theme,
      fakeLayoutConfiguration(brandBrief, theme),
    );
    const hero = result.components.find((c) => c.componentId === 'hero-banner');
    const headline = hero?.placeholders.find((p) => p.slotName === 'headline');
    const backgroundImage = hero?.placeholders.find((p) => p.slotName === 'backgroundImage');
    expect(headline).toMatchObject({ placeholderLabel: '[Headline]', required: true });
    expect(backgroundImage).toMatchObject({
      placeholderLabel: '[Background Image]',
      required: false,
    });
  });

  it('themeTokens on a component are reference paths, not resolved values', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const result = generateComponentManifest(
      brandBrief,
      theme,
      fakeLayoutConfiguration(brandBrief, theme),
    );
    const hero = result.components.find((c) => c.componentId === 'hero-banner');
    expect(hero?.themeTokens.backgroundColor).toBe('token.background');
    expect(hero?.themeTokens.font).toBe('token.heading');
    for (const value of Object.values(hero?.themeTokens ?? {})) {
      expect(value.startsWith('token.')).toBe(true);
    }
  });

  it('inherits responsive rules and grid columns from the section, for both the section and its children', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const result = generateComponentManifest(brandBrief, theme, layout);

    const menuSection = result.components.find((c) => c.componentId === 'section-menu');
    const menuComponent = result.components.find((c) => c.componentId === 'menu-showcase');
    expect(menuSection?.responsiveRules).toEqual(menuComponent?.responsiveRules);
    expect(menuSection?.responsiveRules.columns).toEqual({ mobile: 1, tablet: 2, desktop: 3 });
  });

  it('throws when a section maps to a componentId not classified in COMPONENT_TYPE_REGISTRY', () => {
    const brandBrief = fakeBrandBrief();
    const theme = fakeThemeConfiguration({
      sectionComponentMap: {
        hero: ['invented-widget'],
        about: [],
        menu: [],
        gallery: [],
        testimonials: [],
        'reservation-cta': [],
        contact: [],
        footer: [],
      },
    });
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    expect(() => generateComponentManifest(brandBrief, theme, layout)).toThrow(/not classified/);
  });
});
