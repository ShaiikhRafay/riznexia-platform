import { describe, expect, it } from 'vitest';
import {
  componentDefinitionSchema,
  componentManifestSchema,
  componentVisibilitySchema,
  placeholderDefinitionSchema,
  themeTokensSchema,
} from './component-manifest';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';
const UUID_D = '44444444-4444-4444-8444-444444444444';

function validThemeTokens() {
  return {
    primary: '#8B4513',
    secondary: '#F5DEB3',
    accent: '#FF6347',
    background: '#FFF8DC',
    text: '#2F1B0C',
    heading: 'Georgia',
    body: 'Helvetica',
    radius: { small: '4px', medium: '8px', large: '16px', full: '9999px' },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
    shadow: 'moderate',
    button: 'solid-button',
    card: 'image-overlay',
    animation: 'moderate',
  };
}

function validComponent(overrides: Record<string, unknown> = {}) {
  return {
    componentId: 'hero-1',
    componentType: 'hero',
    parentComponentId: 'section-hero',
    childComponentIds: [],
    requiredContent: [{ slotName: 'headline', kind: 'text' }],
    optionalContent: [{ slotName: 'subheadline', kind: 'text' }],
    themeTokens: { backgroundColor: 'token.background', font: 'token.heading' },
    responsiveRules: { rule: 'reflow' },
    accessibility: {
      role: 'banner',
      altTextRequired: true,
      minTouchTargetPx: 44,
      contrastLevel: 'AA',
    },
    visibility: { mode: 'always' },
    placeholders: [
      { slotName: 'headline', kind: 'text', required: true, placeholderLabel: '[Headline]' },
    ],
    ...overrides,
  };
}

function validManifest(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    businessId: UUID_B,
    businessAnalysisId: UUID_C,
    themeConfigurationId: UUID_D,
    layoutConfigurationId: UUID_A,
    configVersion: 1,
    componentEngineVersion: 'v1.0',
    themeTokens: validThemeTokens(),
    components: [validComponent()],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('themeTokensSchema', () => {
  it('accepts a well-formed token set', () => {
    expect(themeTokensSchema.safeParse(validThemeTokens()).success).toBe(true);
  });

  it('rejects an unknown shadow value', () => {
    expect(themeTokensSchema.safeParse({ ...validThemeTokens(), shadow: 'extreme' }).success).toBe(
      false,
    );
  });

  it('rejects a missing radius rung', () => {
    const tokens = validThemeTokens();
    const { large: _omit, ...radius } = tokens.radius;
    expect(themeTokensSchema.safeParse({ ...tokens, radius }).success).toBe(false);
  });
});

describe('componentVisibilitySchema', () => {
  it('accepts "always" with no condition', () => {
    expect(componentVisibilitySchema.safeParse({ mode: 'always' }).success).toBe(true);
  });

  it('accepts "conditional" with a documented condition', () => {
    expect(
      componentVisibilitySchema.safeParse({ mode: 'conditional', condition: 'sidebar-present' })
        .success,
    ).toBe(true);
  });

  it('rejects "conditional" with no condition', () => {
    expect(componentVisibilitySchema.safeParse({ mode: 'conditional' }).success).toBe(false);
  });

  it('rejects an undocumented condition', () => {
    expect(
      componentVisibilitySchema.safeParse({ mode: 'conditional', condition: 'is-tuesday' }).success,
    ).toBe(false);
  });
});

describe('placeholderDefinitionSchema', () => {
  it('rejects a kind outside the documented set', () => {
    expect(
      placeholderDefinitionSchema.safeParse({
        slotName: 'headline',
        kind: 'video',
        required: true,
        placeholderLabel: '[Headline]',
      }).success,
    ).toBe(false);
  });
});

describe('componentDefinitionSchema', () => {
  it('accepts a well-formed component', () => {
    expect(componentDefinitionSchema.safeParse(validComponent()).success).toBe(true);
  });

  it('rejects a componentType outside the closed taxonomy', () => {
    expect(
      componentDefinitionSchema.safeParse(validComponent({ componentType: 'video-embed' })).success,
    ).toBe(false);
  });

  it('accepts a null parentComponentId (root-level component)', () => {
    expect(
      componentDefinitionSchema.safeParse(validComponent({ parentComponentId: null })).success,
    ).toBe(true);
  });
});

describe('componentManifestSchema', () => {
  it('accepts a well-formed manifest', () => {
    expect(componentManifestSchema.safeParse(validManifest()).success).toBe(true);
  });

  it('accepts an empty components array (structurally valid)', () => {
    expect(componentManifestSchema.safeParse(validManifest({ components: [] })).success).toBe(true);
  });

  it('rejects a missing provenance field', () => {
    const { layoutConfigurationId: _omit, ...rest } = validManifest();
    expect(componentManifestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a components array shape mismatch (wrong entry type)', () => {
    expect(
      componentManifestSchema.safeParse(validManifest({ components: [{ componentId: 'x' }] }))
        .success,
    ).toBe(false);
  });
});
