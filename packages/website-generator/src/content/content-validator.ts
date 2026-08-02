import type { ComponentManifest } from '@riznexia/shared-types';
import type { ContentManifestContent } from './content-generator';

// Module M8.3 — post-generation invariant checks, same internal-assertion
// semantics as layout-validator.ts/component-validator.ts (D-052/D-060):
// every input is already M6/M7/M8.1/M8.2-validated and every binding rule
// here is a fixed lookup, so a failure means a bug in the binder itself,
// not a legitimate business outcome. Throws a plain Error, never a new
// domain exception.
export function validateContentManifest(
  content: ContentManifestContent,
  componentManifest: ComponentManifest,
): void {
  const componentIds = new Set(
    componentManifest.components.map((component) => component.componentId),
  );

  // No orphan content — every binding (bound or unresolved) must reference
  // a real component in the ComponentManifest.
  for (const binding of content.componentContent) {
    assertContent(
      componentIds.has(binding.componentId),
      `componentContent references unknown component "${binding.componentId}"`,
    );
  }
  for (const unresolved of content.unresolvedBindings) {
    assertContent(
      componentIds.has(unresolved.componentId),
      `unresolvedBindings references unknown component "${unresolved.componentId}"`,
    );
  }

  // No duplicated bindings — a (componentId, slotName) pair appears at
  // most once across bound content, and never appears in both bound
  // content and unresolvedBindings simultaneously.
  const boundKeys = new Set<string>();
  for (const binding of content.componentContent) {
    for (const field of binding.fields) {
      const key = `${binding.componentId}::${field.slotName}`;
      assertContent(!boundKeys.has(key), `duplicate binding for "${key}"`);
      boundKeys.add(key);
    }
  }
  for (const unresolved of content.unresolvedBindings) {
    const key = `${unresolved.componentId}::${unresolved.slotName}`;
    assertContent(!boundKeys.has(key), `"${key}" is both bound and listed as unresolved`);
  }

  // Every required component has content — either bound or explicitly
  // recorded as unresolved; never silently missing (founder's resolved
  // fork: an honest gap list, not a hard failure).
  for (const component of componentManifest.components) {
    for (const slot of component.requiredContent) {
      const isBound = boundKeys.has(`${component.componentId}::${slot.slotName}`);
      const isUnresolved = content.unresolvedBindings.some(
        (u) => u.componentId === component.componentId && u.slotName === slot.slotName,
      );
      assertContent(
        isBound || isUnresolved,
        `required slot "${component.componentId}::${slot.slotName}" is neither bound nor recorded as unresolved`,
      );
    }
  }

  // CTA targets exist — every link-kind field carrying an internal target
  // must resolve to a real component.
  for (const binding of content.componentContent) {
    for (const field of binding.fields) {
      if (field.kind !== 'link') continue;
      const value = field.value.value;
      const targets: string[] = Array.isArray(value)
        ? value
            .map((item) => (item as { targetComponentId?: string }).targetComponentId)
            .filter((id): id is string => Boolean(id))
        : (value as { targetComponentId?: string }).targetComponentId
          ? [(value as { targetComponentId: string }).targetComponentId]
          : [];
      for (const target of targets) {
        assertContent(
          componentIds.has(target),
          `CTA target "${target}" (from "${binding.componentId}::${field.slotName}") does not exist`,
        );
      }
    }
  }

  // SEO metadata completeness.
  assertContent(
    content.seoMetadata.keywords.value.length > 0,
    'seoMetadata.keywords must be non-empty',
  );
  assertContent(content.seoMetadata.metaTitle !== null, 'seoMetadata.metaTitle must be resolved');
  assertContent(
    content.seoMetadata.metaDescription !== null,
    'seoMetadata.metaDescription must be resolved',
  );

  // Schema.org data completeness.
  const localBusiness = content.structuredData.find((entry) => entry.type === 'LocalBusiness');
  assertContent(localBusiness !== undefined, 'structuredData is missing LocalBusiness');
  assertContent(
    !!localBusiness && 'name' in localBusiness.data && 'address' in localBusiness.data,
    'LocalBusiness is missing name/address',
  );

  const organization = content.structuredData.find((entry) => entry.type === 'Organization');
  assertContent(organization !== undefined, 'structuredData is missing Organization');
  assertContent(!!organization && 'name' in organization.data, 'Organization is missing name');

  const breadcrumb = content.structuredData.find((entry) => entry.type === 'BreadcrumbList');
  if (breadcrumb) {
    const items = breadcrumb.data.itemListElement?.value;
    assertContent(
      Array.isArray(items) && items.length > 0,
      'BreadcrumbList.itemListElement must be non-empty when present',
    );
  }

  const faqPage = content.structuredData.find((entry) => entry.type === 'FAQPage');
  if (faqPage) {
    const items = faqPage.data.items?.value;
    assertContent(
      Array.isArray(items) && items.length > 0,
      'FAQPage.items must be non-empty when present',
    );
  }
}

function assertContent(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ContentManifest validation failed: ${message}`);
  }
}
