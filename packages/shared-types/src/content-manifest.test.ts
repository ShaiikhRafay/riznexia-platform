import { describe, expect, it } from 'vitest';
import {
  componentContentBindingSchema,
  contentManifestSchema,
  contentValueSchema,
  seoMetadataSchema,
  structuredDataBindingSchema,
  unresolvedBindingSchema,
} from './content-manifest';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';
const UUID_D = '44444444-4444-4444-8444-444444444444';
const UUID_E = '55555555-5555-4555-8555-555555555555';

function validComponentContent() {
  return {
    componentId: 'hero-banner',
    fields: [
      {
        slotName: 'headline',
        kind: 'text',
        value: {
          value: 'Family recipes since 1985',
          source: 'BusinessAnalysis.brandBrief.uniqueSellingPoints[0]',
        },
      },
      {
        slotName: 'primaryCta',
        kind: 'link',
        value: {
          value: { label: 'Order Online', targetComponentId: 'section-contact' },
          source: 'BusinessAnalysis.brandBrief.ctaRecommendations[0]',
        },
      },
    ],
  };
}

function validManifest(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    businessId: UUID_B,
    businessAnalysisId: UUID_C,
    themeConfigurationId: UUID_D,
    layoutConfigurationId: UUID_E,
    componentManifestId: UUID_A,
    configVersion: 1,
    contentEngineVersion: 'v1.0',
    componentContent: [validComponentContent()],
    unresolvedBindings: [
      {
        componentId: 'faq-accordion',
        slotName: 'items',
        required: true,
        reason: 'no-source-available',
      },
    ],
    seoMetadata: {
      keywords: { value: ['diner near me'], source: 'BusinessAnalysis.brandBrief.seoKeywords' },
      localSeoSuggestions: { value: [], source: 'BusinessAnalysis.brandBrief.localSeoSuggestions' },
      metaTitle: {
        value: "Joe's Diner | Italian Restaurant in Karachi",
        source: 'Business.businessName+BusinessAnalysis.brandBrief.industry+Business.city',
      },
      metaDescription: {
        value: 'A family-owned diner.',
        source: 'BusinessAnalysis.brandBrief.businessSummary',
      },
    },
    structuredData: [
      {
        type: 'LocalBusiness',
        data: {
          name: { value: "Joe's Diner", source: 'Business.businessName' },
          address: { value: '123 Main St, Karachi', source: 'Business.address+Business.city' },
        },
      },
    ],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('contentValueSchema', () => {
  it('accepts a sourced text value', () => {
    expect(
      contentValueSchema.safeParse({ value: 'Hello', source: 'Business.businessName' }).success,
    ).toBe(true);
  });

  it('accepts a sourced text list value', () => {
    expect(
      contentValueSchema.safeParse({
        value: ['a', 'b'],
        source: 'BusinessAnalysis.brandBrief.seoKeywords',
      }).success,
    ).toBe(true);
  });

  it('accepts a sourced link value with only a target', () => {
    expect(
      contentValueSchema.safeParse({ value: { targetComponentId: 'section-contact' }, source: 'x' })
        .success,
    ).toBe(true);
  });

  it('accepts a sourced image reference', () => {
    expect(
      contentValueSchema.safeParse({
        value: { photoReference: 'photo-1' },
        source: 'Business.photos[0]',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty source string', () => {
    expect(contentValueSchema.safeParse({ value: 'Hello', source: '' }).success).toBe(false);
  });

  it('rejects a shape matching none of the five sourced-value variants', () => {
    expect(contentValueSchema.safeParse({ value: 42, source: 'x' }).success).toBe(false);
  });
});

describe('componentContentBindingSchema', () => {
  it('accepts a well-formed binding', () => {
    expect(componentContentBindingSchema.safeParse(validComponentContent()).success).toBe(true);
  });

  it('rejects a field with a kind outside the documented set', () => {
    const corrupted = { ...validComponentContent() };
    corrupted.fields = [{ ...corrupted.fields[0], kind: 'video' }] as never;
    expect(componentContentBindingSchema.safeParse(corrupted).success).toBe(false);
  });
});

describe('unresolvedBindingSchema', () => {
  it('rejects a reason outside the documented set', () => {
    expect(
      unresolvedBindingSchema.safeParse({
        componentId: 'x',
        slotName: 'y',
        required: true,
        reason: 'not-yet-implemented',
      }).success,
    ).toBe(false);
  });
});

describe('seoMetadataSchema', () => {
  it('accepts null metaTitle/metaDescription', () => {
    expect(
      seoMetadataSchema.safeParse({
        keywords: { value: ['x'], source: 's' },
        localSeoSuggestions: { value: [], source: 's' },
        metaTitle: null,
        metaDescription: null,
      }).success,
    ).toBe(true);
  });
});

describe('structuredDataBindingSchema', () => {
  it('rejects a type outside the documented schema.org set', () => {
    expect(structuredDataBindingSchema.safeParse({ type: 'Product', data: {} }).success).toBe(
      false,
    );
  });

  it('accepts an empty data map (structurally valid)', () => {
    expect(structuredDataBindingSchema.safeParse({ type: 'FAQPage', data: {} }).success).toBe(true);
  });
});

describe('contentManifestSchema', () => {
  it('accepts a well-formed manifest', () => {
    expect(contentManifestSchema.safeParse(validManifest()).success).toBe(true);
  });

  it('accepts empty componentContent/unresolvedBindings/structuredData arrays', () => {
    expect(
      contentManifestSchema.safeParse(
        validManifest({ componentContent: [], unresolvedBindings: [], structuredData: [] }),
      ).success,
    ).toBe(true);
  });

  it('rejects a missing provenance field', () => {
    const { componentManifestId: _omit, ...rest } = validManifest();
    expect(contentManifestSchema.safeParse(rest).success).toBe(false);
  });
});
