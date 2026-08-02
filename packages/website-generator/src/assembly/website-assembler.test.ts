import { describe, expect, it } from 'vitest';
import { fakeAssembleWebsiteInput } from './assembly-fixtures';
import { assembleWebsite } from './website-assembler';
import { validateWebsiteAssembly } from './website-validator';

describe('assembleWebsite', () => {
  it('produces a deterministic file list for the same input', () => {
    const input = fakeAssembleWebsiteInput();
    const a = assembleWebsite(input);
    const b = assembleWebsite(input);
    expect(a).toEqual(b);
  });

  it('includes every required Next.js project file', () => {
    const files = assembleWebsite(fakeAssembleWebsiteInput());
    const paths = files.map((f) => f.path);
    for (const required of [
      'package.json',
      'app/layout.tsx',
      'app/page.tsx',
      'app/theme-tokens.css',
      'app/robots.ts',
      'app/sitemap.ts',
      'app/manifest.ts',
      'lib/site-data.ts',
      'components/sections/hero.tsx',
      'components/sections/navigation.tsx',
    ]) {
      expect(paths).toContain(required);
    }
  });

  it('sets package.json name from the business name', () => {
    const files = assembleWebsite(fakeAssembleWebsiteInput());
    const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content);
    expect(pkg.name).toBe('joe-s-diner');
  });

  it('generates syntactically valid, non-empty TypeScript for page.tsx and site-data.ts', () => {
    const files = assembleWebsite(fakeAssembleWebsiteInput());
    const page = files.find((f) => f.path === 'app/page.tsx')!;
    const siteData = files.find((f) => f.path === 'lib/site-data.ts')!;
    expect(page.content).toContain('export default function Page');
    expect(page.content).toContain('export const metadata: Metadata');
    expect(page.content).toContain('main-content');
    expect(siteData.content).toContain('export const');
  });

  it('emits at least one JSON-LD script tag with valid JSON', () => {
    const files = assembleWebsite(fakeAssembleWebsiteInput());
    const page = files.find((f) => f.path === 'app/page.tsx')!;
    expect(page.content).toContain('application/ld+json');
    const match = page.content.match(/__html: "((?:[^"\\]|\\.)*)"/);
    expect(match).not.toBeNull();
    const json = JSON.parse(JSON.parse(`"${match![1]}"`));
    expect(json['@context']).toBe('https://schema.org');
  });

  it('passes website assembly validation', () => {
    const input = fakeAssembleWebsiteInput();
    const files = assembleWebsite(input);
    expect(() =>
      validateWebsiteAssembly(
        files,
        input.componentManifest,
        input.contentManifest,
        input.layoutConfiguration,
      ),
    ).not.toThrow();
  });

  it('theme-tokens.css contains every custom property the static components reference', () => {
    const files = assembleWebsite(fakeAssembleWebsiteInput());
    const css = files.find((f) => f.path === 'app/theme-tokens.css')!.content;
    for (const prop of [
      '--color-primary',
      '--color-secondary',
      '--color-accent',
      '--color-background',
      '--color-text',
      '--color-border',
      '--font-heading',
      '--font-body',
      '--radius-small',
      '--radius-medium',
      '--radius-large',
      '--radius-full',
      '--spacing-xs',
      '--spacing-sm',
      '--spacing-md',
      '--spacing-lg',
      '--spacing-xl',
      '--shadow-value',
      '--min-touch-target',
    ]) {
      expect(css).toContain(prop);
    }
  });
});
