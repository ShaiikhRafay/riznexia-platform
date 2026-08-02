import { describe, expect, it } from 'vitest';
import { fakeWebsitePreviewFixture } from '../preview-fixtures';
import { DEVICE_PRESETS } from './device-presets';
import { generateWebsitePreview } from './preview-generator';

describe('generateWebsitePreview', () => {
  it('is deterministic', () => {
    const { themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
    expect(generateWebsitePreview(generatedWebsite, themeConfiguration)).toEqual(
      generateWebsitePreview(generatedWebsite, themeConfiguration),
    );
  });

  it('extracts the real business name from the generated website JSON-LD, not a placeholder', () => {
    const { themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
    const preview = generateWebsitePreview(generatedWebsite, themeConfiguration);
    expect(preview.businessName).toBe("Joe's Diner");
  });

  it('copies theme name/id verbatim from ThemeConfiguration', () => {
    const { themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
    const preview = generateWebsitePreview(generatedWebsite, themeConfiguration);
    expect(preview.themeName).toBe(themeConfiguration.themeName);
    expect(preview.themeId).toBe(themeConfiguration.themeId);
  });

  it('always returns the same fixed desktop/tablet/mobile device presets', () => {
    const { themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
    expect(generateWebsitePreview(generatedWebsite, themeConfiguration).devicePresets).toEqual(
      DEVICE_PRESETS,
    );
  });

  it('produces a sorted file manifest with real byte sizes, matching the full GeneratedWebsite.files list', () => {
    const { themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
    const preview = generateWebsitePreview(generatedWebsite, themeConfiguration);
    expect(preview.files).toHaveLength(generatedWebsite.files.length);
    expect(preview.files.map((f) => f.path)).toEqual([...preview.files.map((f) => f.path)].sort());
    const pageEntry = preview.files.find((f) => f.path === 'app/page.tsx')!;
    const pageFile = generatedWebsite.files.find((f) => f.path === 'app/page.tsx')!;
    expect(pageEntry.sizeBytes).toBe(Buffer.byteLength(pageFile.content, 'utf-8'));
  });

  it('never mutates GeneratedWebsite.files (read-only, D-075)', () => {
    const { themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
    const before = JSON.stringify(generatedWebsite.files);
    generateWebsitePreview(generatedWebsite, themeConfiguration);
    expect(JSON.stringify(generatedWebsite.files)).toBe(before);
  });

  it('throws (an internal-bug signal, not a silent fallback) when app/page.tsx has no business-name JSON-LD entry', () => {
    const { themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
    const files = generatedWebsite.files.filter((file) => file.path !== 'app/page.tsx');
    expect(() =>
      generateWebsitePreview({ ...generatedWebsite, files }, themeConfiguration),
    ).toThrow(/app\/page\.tsx/);
  });
});
