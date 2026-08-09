import { createHash } from 'node:crypto';
import type { GeneratedWebsiteFile } from '@riznexia/shared-types';

// Same sha256-over-a-deterministic-JSON-shape pattern as
// business-analysis/business-fingerprint.ts. Sorted by path first so file
// order (which GeneratedWebsite.files never guarantees beyond "sorted at
// assembly time") can never change the hash for identical content.
export function computeDeploymentHash(files: GeneratedWebsiteFile[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}
