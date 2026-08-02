import { describe, expect, it } from 'vitest';
import { generatedWebsiteFileSchema, generatedWebsiteSchema } from './generated-website';

const UUID_A = '11111111-1111-4111-8111-111111111111';

function validGeneratedWebsite(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    businessId: UUID_A,
    businessAnalysisId: UUID_A,
    themeConfigurationId: UUID_A,
    layoutConfigurationId: UUID_A,
    componentManifestId: UUID_A,
    contentManifestId: UUID_A,
    configVersion: 1,
    assemblyEngineVersion: 'v1.0',
    files: [{ path: 'package.json', content: '{}' }],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('generatedWebsiteFileSchema', () => {
  it('accepts a real {path, content} pair', () => {
    expect(
      generatedWebsiteFileSchema.safeParse({
        path: 'app/page.tsx',
        content: 'export default function Page() {}',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty path', () => {
    expect(generatedWebsiteFileSchema.safeParse({ path: '', content: '' }).success).toBe(false);
  });

  it('allows empty content (e.g. a placeholder .gitkeep file)', () => {
    expect(generatedWebsiteFileSchema.safeParse({ path: '.gitkeep', content: '' }).success).toBe(
      true,
    );
  });
});

describe('generatedWebsiteSchema', () => {
  it('accepts a fully-populated manifest', () => {
    expect(generatedWebsiteSchema.safeParse(validGeneratedWebsite()).success).toBe(true);
  });

  it('rejects a non-UUID FK', () => {
    expect(
      generatedWebsiteSchema.safeParse(validGeneratedWebsite({ contentManifestId: 'not-a-uuid' }))
        .success,
    ).toBe(false);
  });

  it('rejects configVersion <= 0', () => {
    expect(
      generatedWebsiteSchema.safeParse(validGeneratedWebsite({ configVersion: 0 })).success,
    ).toBe(false);
  });

  it('rejects a missing assemblyEngineVersion', () => {
    expect(
      generatedWebsiteSchema.safeParse(validGeneratedWebsite({ assemblyEngineVersion: '' }))
        .success,
    ).toBe(false);
  });

  it('rejects a files entry missing "content"', () => {
    expect(
      generatedWebsiteSchema.safeParse(validGeneratedWebsite({ files: [{ path: 'x' }] })).success,
    ).toBe(false);
  });
});
