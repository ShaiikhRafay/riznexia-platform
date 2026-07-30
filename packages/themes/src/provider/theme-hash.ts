import { createHash } from 'node:crypto';
import type { ThemeDefinitionContent } from './theme-provider.interface';

// Same technique as M6's PROMPT_HASH (packages/ai) — computed from the
// theme's fixed content at module load, so it can never drift from what
// actually produced a given ThemeConfiguration. Any edit to a theme
// definition's content changes its hash automatically.
export function computeThemeHash(version: string, content: ThemeDefinitionContent): string {
  return createHash('sha256').update(JSON.stringify({ version, content })).digest('hex');
}
