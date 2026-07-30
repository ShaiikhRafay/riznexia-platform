import type { ThemeConfiguration } from '@riznexia/shared-types';
import type { LayoutConfigurationContent } from './layout-generator';

// Module M8.1 — post-generation invariant checks. Founder's resolved fork:
// since generateLayout()'s inputs are already M6/M7-validated and every
// derivation rule is a fixed lookup over a known domain, a failure here
// means a bug in the generator itself, not a legitimate business outcome
// (unlike M7's THEME_NOT_FOUND, which is a real "nothing scored high
// enough" case). So this throws a plain Error, never a new domain
// exception/HTTP error code — callers should let it propagate as an
// unhandled 500, the same way any other internal-invariant violation would.
export function validateLayoutConfiguration(
  content: LayoutConfigurationContent,
  themeConfiguration: ThemeConfiguration,
): void {
  const { sectionOrder } = themeConfiguration;
  const sectionIdSet = new Set(sectionOrder);

  // Section ordering + required sections exist — pageStructure must be
  // exactly sectionOrder, same order, 1-based and gapless.
  const pageSectionIds = content.pageStructure.map((section) => section.sectionId);
  assertLayout(
    pageSectionIds.length === sectionOrder.length &&
      pageSectionIds.every((id, index) => id === sectionOrder[index]),
    `pageStructure section order [${pageSectionIds.join(', ')}] does not match ThemeConfiguration.sectionOrder [${sectionOrder.join(', ')}]`,
  );
  assertLayout(
    content.pageStructure.every((section, index) => section.order === index + 1),
    'pageStructure entries must be ordered 1..N with no gaps',
  );

  // Navigation integrity — every nav item must be a real section.
  const unknownNavItems = content.navigation.items.filter((item) => !sectionIdSet.has(item));
  assertLayout(
    unknownNavItems.length === 0,
    `navigation.items references unknown section(s): ${unknownNavItems.join(', ')}`,
  );

  // Sidebar populated if and only if navigationStyle is 'sidebar'.
  assertLayout(
    (themeConfiguration.navigationStyle === 'sidebar') === (content.sidebar !== null),
    'sidebar must be populated if and only if navigationStyle is "sidebar"',
  );

  // Responsive rules exist for every section.
  const missingResponsiveRules = sectionOrder.filter(
    (id) => content.responsiveRules.perSection[id] === undefined,
  );
  assertLayout(
    missingResponsiveRules.length === 0,
    `responsiveRules.perSection is missing entries for: ${missingResponsiveRules.join(', ')}`,
  );

  // Accessibility constraints carried through from the source theme.
  assertLayout(
    content.responsiveRules.tapTargetSizePx > 0,
    'responsiveRules.tapTargetSizePx must be positive',
  );
  assertLayout(
    themeConfiguration.accessibilityProfile != null,
    'source ThemeConfiguration is missing its accessibilityProfile',
  );

  // Every grid/component-placeholder reference resolves to a real section.
  const unknownGridSections = content.grid.filter((entry) => !sectionIdSet.has(entry.sectionId));
  assertLayout(
    unknownGridSections.length === 0,
    'grid references a section not present in sectionOrder',
  );
  const unknownPlaceholderSections = content.componentPlaceholders.filter(
    (entry) => !sectionIdSet.has(entry.sectionId),
  );
  assertLayout(
    unknownPlaceholderSections.length === 0,
    'componentPlaceholders references a section not present in sectionOrder',
  );
}

function assertLayout(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`LayoutConfiguration validation failed: ${message}`);
  }
}
