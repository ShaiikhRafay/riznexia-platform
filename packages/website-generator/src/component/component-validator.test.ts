import { describe, expect, it } from 'vitest';
import { generateComponentManifest } from './component-generator';
import { validateComponentManifest } from './component-validator';
import {
  fakeBrandBrief,
  fakeLayoutConfiguration,
  fakeThemeConfiguration,
} from './component-fixtures';

function realManifest(navigationStyle: 'top-bar' | 'sidebar' = 'top-bar-sticky' as never) {
  const brandBrief = fakeBrandBrief();
  const theme = fakeThemeConfiguration({ navigationStyle });
  const layout = fakeLayoutConfiguration(brandBrief, theme);
  return generateComponentManifest(brandBrief, theme, layout);
}

describe('validateComponentManifest', () => {
  it('does not throw for a real generateComponentManifest() output', () => {
    expect(() => validateComponentManifest(realManifest())).not.toThrow();
  });

  it('does not throw for a sidebar-navigation manifest', () => {
    expect(() => validateComponentManifest(realManifest('sidebar'))).not.toThrow();
  });

  it('throws on a duplicate componentId', () => {
    const manifest = realManifest();
    const corrupted = {
      ...manifest,
      components: [...manifest.components, manifest.components[0]!],
    };
    expect(() => validateComponentManifest(corrupted)).toThrow(/duplicate componentId/);
  });

  it('throws when a component references an unknown parentComponentId', () => {
    const manifest = realManifest();
    // 'navigation' is root-level and referenced by no one's childComponentIds,
    // so this isolates the "own parentComponentId is unknown" check from the
    // separate "child points back to parent" check below.
    const corrupted = {
      ...manifest,
      components: manifest.components.map((c) =>
        c.componentId === 'navigation' ? { ...c, parentComponentId: 'section-does-not-exist' } : c,
      ),
    };
    expect(() => validateComponentManifest(corrupted)).toThrow(/unknown parentComponentId/);
  });

  it('throws when a component references an unknown child', () => {
    const manifest = realManifest();
    const corrupted = {
      ...manifest,
      components: manifest.components.map((c) =>
        c.componentId === 'section-hero'
          ? { ...c, childComponentIds: [...c.childComponentIds, 'ghost-component'] }
          : c,
      ),
    };
    expect(() => validateComponentManifest(corrupted)).toThrow(/unknown child/);
  });

  it('throws when a child does not point back to its declared parent', () => {
    const manifest = realManifest();
    const corrupted = {
      ...manifest,
      components: manifest.components.map((c) =>
        c.componentId === 'hero-banner' ? { ...c, parentComponentId: 'section-about' } : c,
      ),
    };
    expect(() => validateComponentManifest(corrupted)).toThrow(/does not point back/);
  });

  it('throws when there is no navigation component', () => {
    const manifest = realManifest();
    const corrupted = {
      ...manifest,
      components: manifest.components.filter((c) => c.componentType !== 'navigation'),
    };
    expect(() => validateComponentManifest(corrupted)).toThrow(/exactly one navigation component/);
  });

  it('throws when a sidebar component is not conditionally visible', () => {
    const manifest = realManifest('sidebar');
    const corrupted = {
      ...manifest,
      components: manifest.components.map((c) =>
        c.componentType === 'sidebar' ? { ...c, visibility: { mode: 'always' as const } } : c,
      ),
    };
    expect(() => validateComponentManifest(corrupted)).toThrow(/must be conditionally visible/);
  });

  it('throws when a component has a non-positive minTouchTargetPx', () => {
    const manifest = realManifest();
    const corrupted = {
      ...manifest,
      components: manifest.components.map((c, i) =>
        i === 0 ? { ...c, accessibility: { ...c.accessibility, minTouchTargetPx: 0 } } : c,
      ),
    };
    expect(() => validateComponentManifest(corrupted)).toThrow(/non-positive minTouchTargetPx/);
  });

  it('throws when responsive grid columns are non-monotonic', () => {
    const manifest = realManifest();
    const corrupted = {
      ...manifest,
      components: manifest.components.map((c) =>
        c.componentId === 'section-menu'
          ? {
              ...c,
              responsiveRules: {
                ...c.responsiveRules,
                columns: { mobile: 4, tablet: 2, desktop: 3 },
              },
            }
          : c,
      ),
    };
    expect(() => validateComponentManifest(corrupted)).toThrow(/non-monotonic/);
  });
});
