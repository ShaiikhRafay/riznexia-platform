import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface GeneratedFile {
  path: string;
  content: string;
}

// templates/nextjs-base/ sits alongside src/ (outside this package's own
// tsconfig `include`, Module M8.4) — a directory of plain, static,
// production-quality files, never generated or modified, only read
// verbatim at runtime. Resolved relative to this compiled file's own
// location (dist/assembly/) rather than process.cwd() so it works
// regardless of the caller's working directory.
const TEMPLATE_ROOT = join(__dirname, '..', '..', 'templates', 'nextjs-base');

/**
 * Recursively reads every file under templates/nextjs-base/, returning
 * {path, content} pairs with forward-slash, template-root-relative paths,
 * sorted for determinism (the same template directory always produces the
 * same ordered file list, independent of filesystem readdir ordering).
 */
export function loadStaticTemplateFiles(): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
      } else if (stats.isFile()) {
        const relativePath = relative(TEMPLATE_ROOT, fullPath).split('\\').join('/');
        files.push({ path: relativePath, content: readFileSync(fullPath, 'utf-8') });
      }
    }
  }

  walk(TEMPLATE_ROOT);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
