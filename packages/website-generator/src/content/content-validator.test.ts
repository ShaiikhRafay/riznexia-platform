import { describe, expect, it } from 'vitest';
import { generateContentManifest } from './content-generator';
import { validateContentManifest } from './content-validator';
import {
  fakeBrandBrief,
  fakeBusinessContactInfo,
  fakeComponentManifest,
  fakeLayoutConfiguration,
  fakeThemeConfiguration,
} from './content-fixtures';

function realContent() {
  const brandBrief = fakeBrandBrief();
  const business = fakeBusinessContactInfo();
  const theme = fakeThemeConfiguration();
  const layout = fakeLayoutConfiguration(brandBrief, theme);
  const manifest = fakeComponentManifest(brandBrief, theme, layout);
  const content = generateContentManifest(brandBrief, business, theme, layout, manifest);
  return { content, manifest };
}

describe('validateContentManifest', () => {
  it('does not throw for a real generateContentManifest() output', () => {
    const { content, manifest } = realContent();
    expect(() => validateContentManifest(content, manifest)).not.toThrow();
  });

  it('throws when componentContent references an unknown component', () => {
    const { content, manifest } = realContent();
    const corrupted = {
      ...content,
      componentContent: [...content.componentContent, { componentId: 'ghost', fields: [] }],
    };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(
      /componentContent references unknown component/,
    );
  });

  it('throws when unresolvedBindings references an unknown component', () => {
    const { content, manifest } = realContent();
    const corrupted = {
      ...content,
      unresolvedBindings: [
        ...content.unresolvedBindings,
        {
          componentId: 'ghost',
          slotName: 'x',
          required: true,
          reason: 'no-source-available' as const,
        },
      ],
    };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(
      /unresolvedBindings references unknown component/,
    );
  });

  it('throws on a duplicate binding within componentContent', () => {
    const { content, manifest } = realContent();
    const hero = content.componentContent.find((c) => c.componentId === 'hero-banner')!;
    const corrupted = {
      ...content,
      componentContent: [
        ...content.componentContent,
        { componentId: hero.componentId, fields: [hero.fields[0]!] },
      ],
    };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(/duplicate binding/);
  });

  it('throws when a slot is both bound and listed as unresolved', () => {
    const { content, manifest } = realContent();
    const hero = content.componentContent.find((c) => c.componentId === 'hero-banner')!;
    const corrupted = {
      ...content,
      unresolvedBindings: [
        ...content.unresolvedBindings,
        {
          componentId: hero.componentId,
          slotName: hero.fields[0]!.slotName,
          required: true,
          reason: 'no-source-available' as const,
        },
      ],
    };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(
      /both bound and listed as unresolved/,
    );
  });

  it('throws when a required slot is neither bound nor recorded as unresolved', () => {
    const { content, manifest } = realContent();
    const hero = content.componentContent.find((c) => c.componentId === 'hero-banner')!;
    const corrupted = {
      ...content,
      componentContent: content.componentContent.map((c) =>
        c.componentId === hero.componentId
          ? { ...c, fields: c.fields.filter((f) => f.slotName !== 'headline') }
          : c,
      ),
    };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(
      /neither bound nor recorded as unresolved/,
    );
  });

  it('throws when a CTA target does not resolve to a real component', () => {
    const { content, manifest } = realContent();
    const corrupted = {
      ...content,
      componentContent: content.componentContent.map((c) =>
        c.componentId === 'hero-banner'
          ? {
              ...c,
              fields: c.fields.map((f) =>
                f.slotName === 'primaryCta'
                  ? {
                      ...f,
                      value: {
                        value: { targetComponentId: 'ghost-section' },
                        source: f.value.source,
                      },
                    }
                  : f,
              ),
            }
          : c,
      ),
    };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(
      /CTA target "ghost-section"/,
    );
  });

  it('throws when seoMetadata.metaTitle is null', () => {
    const { content, manifest } = realContent();
    const corrupted = { ...content, seoMetadata: { ...content.seoMetadata, metaTitle: null } };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(
      /metaTitle must be resolved/,
    );
  });

  it('throws when structuredData is missing LocalBusiness', () => {
    const { content, manifest } = realContent();
    const corrupted = {
      ...content,
      structuredData: content.structuredData.filter((entry) => entry.type !== 'LocalBusiness'),
    };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(/missing LocalBusiness/);
  });

  it('throws when a present BreadcrumbList has an empty itemListElement', () => {
    const { content, manifest } = realContent();
    const corrupted = {
      ...content,
      structuredData: content.structuredData.map((entry) =>
        entry.type === 'BreadcrumbList'
          ? {
              ...entry,
              data: { itemListElement: { value: [], source: entry.data.itemListElement!.source } },
            }
          : entry,
      ),
    };
    expect(() => validateContentManifest(corrupted, manifest)).toThrow(
      /BreadcrumbList.itemListElement must be non-empty/,
    );
  });
});
