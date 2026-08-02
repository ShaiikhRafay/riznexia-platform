import type { ComponentManifestContent } from './component-generator';

// Module M8.2 — post-generation invariant checks, same internal-assertion
// semantics as layout-validator.ts (D-052): every input is already
// M6/M7/M8.1-validated and every derivation rule here is a fixed lookup,
// so a failure means a bug in the generator itself, not a legitimate
// business outcome. Throws a plain Error, never a new domain exception.
export function validateComponentManifest(content: ComponentManifestContent): void {
  const components = content.components;
  const byId = new Map(components.map((component) => [component.componentId, component]));

  assertManifest(byId.size === components.length, 'duplicate componentId(s) found in the manifest');

  // Component hierarchy + parent/child integrity.
  for (const component of components) {
    if (component.parentComponentId !== null) {
      assertManifest(
        byId.has(component.parentComponentId),
        `component "${component.componentId}" references unknown parentComponentId "${component.parentComponentId}"`,
      );
    }
    for (const childId of component.childComponentIds) {
      const child = byId.get(childId);
      assertManifest(
        child !== undefined,
        `component "${component.componentId}" references unknown child "${childId}"`,
      );
      assertManifest(
        child?.parentComponentId === component.componentId,
        `component "${childId}" does not point back to its declared parent "${component.componentId}"`,
      );
    }
  }

  // Required component dependencies — exactly one navigation component;
  // any sidebar component must be conditionally visible on its own presence.
  const navigationComponents = components.filter(
    (component) => component.componentType === 'navigation',
  );
  assertManifest(
    navigationComponents.length === 1,
    `expected exactly one navigation component, found ${navigationComponents.length}`,
  );

  for (const component of components.filter((c) => c.componentType === 'sidebar')) {
    assertManifest(
      component.visibility.mode === 'conditional' &&
        component.visibility.condition === 'sidebar-present',
      `sidebar component "${component.componentId}" must be conditionally visible on "sidebar-present"`,
    );
  }

  // Accessibility metadata — present and well-formed on every component.
  for (const component of components) {
    assertManifest(
      component.accessibility.minTouchTargetPx > 0,
      `component "${component.componentId}" has a non-positive minTouchTargetPx`,
    );
    assertManifest(
      component.accessibility.role.length > 0,
      `component "${component.componentId}" is missing an accessibility role`,
    );
  }

  // Responsive compatibility — grid columns, when present, must be
  // monotonically non-decreasing from mobile to desktop.
  for (const component of components) {
    const columns = component.responsiveRules.columns;
    if (columns) {
      assertManifest(
        columns.mobile <= columns.tablet && columns.tablet <= columns.desktop,
        `component "${component.componentId}" has non-monotonic responsive column counts`,
      );
    }
  }
}

function assertManifest(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ComponentManifest validation failed: ${message}`);
  }
}
