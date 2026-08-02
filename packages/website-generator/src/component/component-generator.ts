import type {
  BusinessAnalysisOutput,
  ComponentDefinition,
  ComponentResponsiveRules,
  ComponentVisibility,
  ContentSlot,
  ContrastLevel,
  LayoutConfiguration,
  PlaceholderDefinition,
  SupportedComponentType,
  ThemeConfiguration,
  ThemeTokens,
} from '@riznexia/shared-types';
import { COMPONENT_TYPE_REGISTRY } from '@riznexia/themes';
import { baseTokensForType, COMPONENT_TYPE_DEFINITIONS } from './component-type-definitions';
import { computeThemeTokens, defaultRadiusToken } from './component-tokens';

// Versions this module's derivation rules (the component-type table,
// token-reference defaults, hierarchy-building logic below) — distinct
// from componentEngineVersion's inputs' own versions (themeVersion,
// selectedByEngineVersion, layoutEngineVersion).
export const COMPONENT_ENGINE_VERSION = 'v1.0';

export interface ComponentManifestContent {
  componentEngineVersion: string;
  themeTokens: ThemeTokens;
  components: ComponentDefinition[];
}

/**
 * Pure and deterministic: the same (brandBrief, themeConfiguration,
 * layoutConfiguration) triple always produces a structurally identical
 * ComponentManifestContent — every field is either a fixed lookup
 * (component-type-definitions.ts), a verbatim pass-through of an upstream
 * value, or arithmetic/set-membership over the three inputs. No AI call,
 * no randomness.
 *
 * Produces a Component Manifest only — no React/HTML/CSS/Tailwind, no
 * bound content (requiredContent/optionalContent are a content CONTRACT,
 * placeholders carry a generic structural label, never business copy).
 *
 * Hierarchy is 2 levels: a synthetic "section" wrapper per
 * LayoutConfiguration.pageStructure entry (root), with that section's
 * mapped theme component(s) — from M8.1's componentPlaceholders — as
 * children. A root-level "navigation" component and an optional
 * "sidebar" component (only when LayoutConfiguration.sidebar is
 * populated) round out the manifest. No synthetic sub-children (e.g.
 * individual cards inside a grid) — their count depends on bound
 * content, out of scope for this phase (M8.3).
 *
 * "Only supported components may be generated": every theme componentId
 * must resolve through packages/themes' COMPONENT_TYPE_REGISTRY onto one
 * of SUPPORTED_COMPONENT_TYPES — an unclassified componentId throws
 * rather than silently generating an untyped/hallucinated component.
 */
export function generateComponentManifest(
  brandBrief: BusinessAnalysisOutput,
  themeConfiguration: ThemeConfiguration,
  layoutConfiguration: LayoutConfiguration,
): ComponentManifestContent {
  const themeTokens = computeThemeTokens(themeConfiguration);
  const radiusToken = defaultRadiusToken(themeConfiguration.cardStyle);
  const accessibilityBase = {
    minTouchTargetPx: themeConfiguration.accessibilityProfile.minTouchTargetPx,
    contrastLevel: themeConfiguration.accessibilityProfile.contrastLevel,
  };

  const gridColumnsBySectionId = new Map(
    layoutConfiguration.grid.map((entry) => [entry.sectionId, entry.columns]),
  );
  const componentIdsBySectionId = new Map<string, string[]>();
  for (const placeholder of layoutConfiguration.componentPlaceholders) {
    const existing = componentIdsBySectionId.get(placeholder.sectionId) ?? [];
    existing.push(placeholder.componentId);
    componentIdsBySectionId.set(placeholder.sectionId, existing);
  }

  const components: ComponentDefinition[] = [
    buildComponent({
      componentId: 'navigation',
      componentType: 'navigation',
      parentComponentId: null,
      childComponentIds: [],
      accessibilityBase,
      radiusToken,
      responsiveRules: { rule: 'reflow' },
      visibility: { mode: 'always' },
      addTrustSignalSlot: false,
    }),
  ];

  for (const section of layoutConfiguration.pageStructure) {
    const childComponentIds = componentIdsBySectionId.get(section.sectionId) ?? [];
    const sectionComponentId = `section-${section.sectionId}`;
    const responsiveRules: ComponentResponsiveRules = {
      rule: layoutConfiguration.responsiveRules.perSection[section.sectionId] ?? 'reflow',
      columns: gridColumnsBySectionId.get(section.sectionId),
    };

    components.push(
      buildComponent({
        componentId: sectionComponentId,
        componentType: 'section',
        parentComponentId: null,
        childComponentIds,
        accessibilityBase,
        radiusToken,
        responsiveRules,
        visibility: { mode: 'always' },
        addTrustSignalSlot: false,
      }),
    );

    for (const componentId of childComponentIds) {
      const componentType = COMPONENT_TYPE_REGISTRY[componentId];
      if (!componentType) {
        throw new Error(
          `Unsupported component: "${componentId}" is not classified in COMPONENT_TYPE_REGISTRY (packages/themes) — every theme componentSet entry must be registered before it can be generated.`,
        );
      }

      components.push(
        buildComponent({
          componentId,
          componentType,
          parentComponentId: sectionComponentId,
          childComponentIds: [],
          accessibilityBase,
          radiusToken,
          responsiveRules,
          visibility: { mode: 'always' },
          addTrustSignalSlot: componentType === 'hero' && brandBrief.trustSignals.length > 0,
        }),
      );
    }
  }

  if (layoutConfiguration.sidebar !== null) {
    components.push(
      buildComponent({
        componentId: 'sidebar',
        componentType: 'sidebar',
        parentComponentId: null,
        childComponentIds: [],
        accessibilityBase,
        radiusToken,
        responsiveRules: { rule: 'reflow' },
        visibility: { mode: 'conditional', condition: 'sidebar-present' },
        addTrustSignalSlot: false,
      }),
    );
  }

  return { componentEngineVersion: COMPONENT_ENGINE_VERSION, themeTokens, components };
}

interface BuildComponentParams {
  componentId: string;
  componentType: SupportedComponentType;
  parentComponentId: string | null;
  childComponentIds: string[];
  accessibilityBase: { minTouchTargetPx: number; contrastLevel: ContrastLevel };
  radiusToken: string;
  responsiveRules: ComponentResponsiveRules;
  visibility: ComponentVisibility;
  // brandBrief.trustSignals is the one direct M6 signal this phase uses
  // beyond what's already threaded through Theme/Layout configs — a
  // hero gets an optional 'trustSignal' slot only when real trust
  // signals exist for this business.
  addTrustSignalSlot: boolean;
}

function buildComponent(params: BuildComponentParams): ComponentDefinition {
  const typeDef = COMPONENT_TYPE_DEFINITIONS[params.componentType];
  const optionalContent: ContentSlot[] = params.addTrustSignalSlot
    ? [...typeDef.optionalContent, { slotName: 'trustSignal', kind: 'text' }]
    : typeDef.optionalContent;

  return {
    componentId: params.componentId,
    componentType: params.componentType,
    parentComponentId: params.parentComponentId,
    childComponentIds: params.childComponentIds,
    requiredContent: typeDef.requiredContent,
    optionalContent,
    themeTokens: baseTokensForType(params.componentType, params.radiusToken),
    responsiveRules: params.responsiveRules,
    accessibility: {
      role: typeDef.accessibilityRole,
      altTextRequired: typeDef.altTextRequired,
      minTouchTargetPx: params.accessibilityBase.minTouchTargetPx,
      contrastLevel: params.accessibilityBase.contrastLevel,
    },
    visibility: params.visibility,
    placeholders: buildPlaceholders(typeDef.requiredContent, optionalContent),
  };
}

function buildPlaceholders(
  required: ContentSlot[],
  optional: ContentSlot[],
): PlaceholderDefinition[] {
  return [
    ...required.map((slot) => ({
      ...slot,
      required: true,
      placeholderLabel: placeholderLabelFor(slot.slotName),
    })),
    ...optional.map((slot) => ({
      ...slot,
      required: false,
      placeholderLabel: placeholderLabelFor(slot.slotName),
    })),
  ];
}

// A generic structural label derived purely from the slot's technical
// name (e.g. 'backgroundImage' -> '[Background Image]') — never
// business-specific copy, so this stays a structural marker, not
// generated website content.
function placeholderLabelFor(slotName: string): string {
  const spaced = slotName.replace(/([A-Z])/g, ' $1').trim();
  const titleCased = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return `[${titleCased}]`;
}
