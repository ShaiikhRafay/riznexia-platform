import { describe, expect, it } from 'vitest';
import { generateLayout } from './layout-generator';
import { validateLayoutConfiguration } from './layout-validator';
import { fakeBrandBrief, fakeThemeConfiguration } from './layout-fixtures';

describe('validateLayoutConfiguration', () => {
  it('does not throw for a real generateLayout() output', () => {
    const theme = fakeThemeConfiguration();
    const content = generateLayout(fakeBrandBrief(), theme);
    expect(() => validateLayoutConfiguration(content, theme)).not.toThrow();
  });

  it('does not throw for a sidebar-navigation theme', () => {
    const theme = fakeThemeConfiguration({ navigationStyle: 'sidebar' });
    const content = generateLayout(fakeBrandBrief(), theme);
    expect(() => validateLayoutConfiguration(content, theme)).not.toThrow();
  });

  it('throws when pageStructure section order does not match ThemeConfiguration.sectionOrder', () => {
    const theme = fakeThemeConfiguration();
    const content = generateLayout(fakeBrandBrief(), theme);
    const corrupted = { ...content, pageStructure: [...content.pageStructure].reverse() };
    expect(() => validateLayoutConfiguration(corrupted, theme)).toThrow(/section order/);
  });

  it('throws when pageStructure order numbers have a gap', () => {
    const theme = fakeThemeConfiguration();
    const content = generateLayout(fakeBrandBrief(), theme);
    const corrupted = {
      ...content,
      pageStructure: content.pageStructure.map((section, index) => ({
        ...section,
        order: index === 0 ? 5 : section.order,
      })),
    };
    expect(() => validateLayoutConfiguration(corrupted, theme)).toThrow(/ordered 1\.\.N/);
  });

  it('throws when navigation.items references an unknown section', () => {
    const theme = fakeThemeConfiguration();
    const content = generateLayout(fakeBrandBrief(), theme);
    const corrupted = {
      ...content,
      navigation: {
        ...content.navigation,
        items: [...content.navigation.items, 'not-a-real-section'],
      },
    };
    expect(() => validateLayoutConfiguration(corrupted, theme)).toThrow(/unknown section/);
  });

  it('throws when sidebar is populated but navigationStyle is not "sidebar"', () => {
    const theme = fakeThemeConfiguration({ navigationStyle: 'top-bar' });
    const content = generateLayout(fakeBrandBrief(), theme);
    const corrupted = {
      ...content,
      sidebar: { position: 'left' as const, width: 'standard' as const, sticky: true },
    };
    expect(() => validateLayoutConfiguration(corrupted, theme)).toThrow(
      /sidebar must be populated/,
    );
  });

  it('throws when sidebar is null but navigationStyle is "sidebar"', () => {
    const theme = fakeThemeConfiguration({ navigationStyle: 'sidebar' });
    const content = generateLayout(fakeBrandBrief(), theme);
    const corrupted = { ...content, sidebar: null };
    expect(() => validateLayoutConfiguration(corrupted, theme)).toThrow(
      /sidebar must be populated/,
    );
  });

  it('throws when responsiveRules.perSection is missing an entry for a real section', () => {
    const theme = fakeThemeConfiguration();
    const content = generateLayout(fakeBrandBrief(), theme);
    const { menu: _omit, ...perSection } = content.responsiveRules.perSection;
    const corrupted = { ...content, responsiveRules: { ...content.responsiveRules, perSection } };
    expect(() => validateLayoutConfiguration(corrupted, theme)).toThrow(/missing entries/);
  });

  it('throws when grid references an unknown section', () => {
    const theme = fakeThemeConfiguration();
    const content = generateLayout(fakeBrandBrief(), theme);
    const corrupted = {
      ...content,
      grid: [
        ...content.grid,
        {
          sectionId: 'not-a-real-section',
          columns: { mobile: 1, tablet: 2, desktop: 3 },
          gap: 'standard' as const,
        },
      ],
    };
    expect(() => validateLayoutConfiguration(corrupted, theme)).toThrow(/grid references/);
  });

  it('throws when componentPlaceholders references an unknown section', () => {
    const theme = fakeThemeConfiguration();
    const content = generateLayout(fakeBrandBrief(), theme);
    const corrupted = {
      ...content,
      componentPlaceholders: [
        ...content.componentPlaceholders,
        { componentId: 'x', sectionId: 'not-a-real-section', order: 0 },
      ],
    };
    expect(() => validateLayoutConfiguration(corrupted, theme)).toThrow(
      /componentPlaceholders references/,
    );
  });
});
