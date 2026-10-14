import { isSafeZipPath, type ZipEntry } from './zip.util';

// Validates a Claude-built Next.js site before it is stored/deployed.
// The Vercel REST adapter only carries TEXT files, so binary assets are
// rejected (use remote image URLs or SVG). Pure function — unit tested.

export interface SiteFile {
  path: string;
  content: string;
}

export interface SiteValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  files: SiteFile[];
  totalBytes: number;
}

const TEXT_EXT = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'css',
  'scss',
  'md',
  'mdx',
  'txt',
  'svg',
  'html',
  'xml',
  'yml',
  'yaml',
  'webmanifest',
  'map',
]);
const SKIP_PREFIXES = ['node_modules/', '.next/', '.git/', '.vercel/', '__MACOSX/', 'out/'];
const SKIP_NAMES = new Set([
  '.DS_Store',
  'Thumbs.db',
  // Repo/editor housekeeping with no extension — never needed to build on Vercel.
  '.gitignore',
  '.gitattributes',
  '.prettierignore',
  '.eslintignore',
  '.editorconfig',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);
const SECRET_NAME = /(^|\/)\.env(\..*)?$/;
const SECRET_CONTENT =
  /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|vercel_[A-Za-z0-9]{20,})/;

export const MAX_SITE_FILES = 400;
export const MAX_SITE_BYTES = 6 * 1024 * 1024;

// Zips made by `zip -r site.zip site` carry a single top-level folder;
// strip it so package.json ends up at the root.
function stripCommonRoot(entries: ZipEntry[]): ZipEntry[] {
  if (entries.length === 0) return entries;
  const first = entries[0]!.path.split('/')[0]!;
  const all = entries.every((e) => e.path.includes('/') && e.path.split('/')[0] === first);
  if (!all) return entries;
  if (entries.some((e) => e.path === 'package.json')) return entries;
  return entries.map((e) => ({ path: e.path.slice(first.length + 1), data: e.data }));
}

export function validateSite(rawEntries: ZipEntry[]): SiteValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files: SiteFile[] = [];
  let totalBytes = 0;

  const entries = stripCommonRoot(rawEntries);
  for (const e of entries) {
    const base = e.path.split('/').pop() ?? '';
    // `*.tsbuildinfo` is a TypeScript incremental-build cache left behind by `tsc`/`next build`.
    if (
      SKIP_NAMES.has(base) ||
      base.endsWith('.tsbuildinfo') ||
      SKIP_PREFIXES.some((s) => e.path.startsWith(s))
    )
      continue;
    if (!isSafeZipPath(e.path)) {
      errors.push(`Unsafe path: ${e.path}`);
      continue;
    }
    if (SECRET_NAME.test(e.path)) {
      errors.push(`Environment file must not be uploaded: ${e.path}`);
      continue;
    }
    const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : '';
    if (!TEXT_EXT.has(ext) && !['Dockerfile', 'LICENSE'].includes(base)) {
      errors.push(
        `Binary/unsupported file "${e.path}". Only text files are deployed — use remote image URLs (Unsplash/Pexels) or SVG instead.`,
      );
      continue;
    }
    if (e.data.includes(0)) {
      errors.push(`File looks binary: ${e.path}`);
      continue;
    }
    const content = e.data.toString('utf8');
    if (SECRET_CONTENT.test(content)) {
      errors.push(`Possible secret/API key found in ${e.path}`);
      continue;
    }
    totalBytes += e.data.length;
    files.push({ path: e.path, content });
  }

  if (files.length > MAX_SITE_FILES)
    errors.push(`Too many files (${files.length}, max ${MAX_SITE_FILES})`);
  if (totalBytes > MAX_SITE_BYTES) errors.push('Site source is larger than 6 MB');

  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const pkgRaw = byPath.get('package.json');
  if (!pkgRaw) {
    errors.push('package.json not found at the site root');
  } else {
    try {
      const pkg = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        scripts?: Record<string, string>;
      };
      if (!pkg.dependencies?.next) errors.push('package.json must depend on "next"');
      if (!pkg.scripts?.build) errors.push('package.json must have a "build" script');
    } catch {
      errors.push('package.json is not valid JSON');
    }
  }
  const hasApp = files.some((f) => /^(src\/)?app\/(page|layout)\.(tsx|jsx|ts|js)$/.test(f.path));
  const hasPages = files.some((f) => /^(src\/)?pages\/index\.(tsx|jsx|ts|js)$/.test(f.path));
  if (!hasApp && !hasPages)
    errors.push('No Next.js home page found (app/page.tsx or pages/index.tsx)');

  const homeText = files
    .filter((f) => /^(src\/)?(app\/page|components\/)/.test(f.path))
    .map((f) => f.content)
    .join('\n');
  if (/lorem ipsum/i.test(homeText)) warnings.push('Contains "lorem ipsum" placeholder text');
  if (!/Riznexia/i.test(files.map((f) => f.content).join('\n'))) {
    warnings.push('Footer credit "Demo website prepared by Riznexia" not found');
  }
  if (/localhost:\d+/.test(homeText)) warnings.push('References localhost in page code');

  return { ok: errors.length === 0, errors, warnings, files, totalBytes };
}
