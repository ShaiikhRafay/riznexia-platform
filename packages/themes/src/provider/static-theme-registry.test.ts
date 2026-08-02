import { describe, expect, it } from 'vitest';
import { StaticThemeRegistry } from './static-theme-registry';
import { COMPONENT_TYPE_REGISTRY } from './component-type-registry';

const EXPECTED_THEME_IDS = [
  'restaurant',
  'salon',
  'dental',
  'law-firm',
  'gym',
  'real-estate',
  'medical',
  'corporate',
];

describe('StaticThemeRegistry', () => {
  const registry = new StaticThemeRegistry();

  it('registers all 8 named themes', () => {
    const ids = registry.listThemes().map((theme) => theme.id);
    expect(ids.sort()).toEqual([...EXPECTED_THEME_IDS].sort());
  });

  it('looks up a theme by id', () => {
    const theme = registry.getTheme('restaurant');
    expect(theme?.name).toBe('Restaurant');
  });

  it('returns undefined for an unregistered theme id', () => {
    expect(registry.getTheme('auto-body-shop')).toBeUndefined();
  });

  it('every registered theme has non-empty version/hash/metadata', () => {
    for (const theme of registry.listThemes()) {
      expect(theme.version).toBeTruthy();
      expect(theme.hash).toBeTruthy();
      expect(theme.createdAt).toBeTruthy();
      expect(theme.updatedAt).toBeTruthy();
    }
  });

  it('every registered theme has a distinct hash', () => {
    const hashes = registry.listThemes().map((theme) => theme.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  // Module M8.1 (DECISIONS.md D-049) — sectionComponentMap is the explicit
  // link between two previously-independent flat lists (componentSet,
  // sectionOrder). This is the invariant the Layout Generator depends on:
  // every componentSet entry must be assigned to exactly one section, and
  // every map key must be a real section.
  it("every registered theme's sectionComponentMap covers componentSet exactly once, keyed only by real sections", () => {
    for (const theme of registry.listThemes()) {
      const { componentSet, sectionOrder, sectionComponentMap } = theme.content;

      const mapKeys = Object.keys(sectionComponentMap);
      expect(new Set(mapKeys)).toEqual(new Set(sectionOrder));

      const assignedComponents = Object.values(sectionComponentMap).flat();
      expect(assignedComponents.sort()).toEqual([...componentSet].sort());
      expect(new Set(assignedComponents).size).toBe(assignedComponents.length);
    }
  });

  // Module M8.2 (DECISIONS.md D-055) — COMPONENT_TYPE_REGISTRY is the
  // closed taxonomy every componentId must classify onto for "only
  // supported components may be generated" to be enforceable. This test
  // is the registry-side half of that guarantee: nothing shippable in
  // packages/themes references a componentId the generator can't classify.
  it("every registered theme's componentSet entries are classified in COMPONENT_TYPE_REGISTRY", () => {
    for (const theme of registry.listThemes()) {
      const unclassified = theme.content.componentSet.filter(
        (componentId) => !(componentId in COMPONENT_TYPE_REGISTRY),
      );
      expect(unclassified).toEqual([]);
    }
  });

  it('every registered theme meets the accessibility baseline (AA or AAA, 44px+ touch targets)', () => {
    for (const theme of registry.listThemes()) {
      const profile = theme.content.accessibilityProfile;
      expect(['AA', 'AAA']).toContain(profile.contrastLevel);
      expect(profile.minTouchTargetPx).toBeGreaterThanOrEqual(44);
      expect(profile.reducedMotionSupport).toBe(true);
      expect(profile.altTextRequired).toBe(true);
    }
  });
});
