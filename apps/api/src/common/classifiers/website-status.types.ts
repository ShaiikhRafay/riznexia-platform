import type { WebsiteStatus } from '@riznexia/shared-types';

export type ClassificationConfidence = 'high' | 'low';

export interface WebsiteStatusClassification {
  status: WebsiteStatus;
  confidence: ClassificationConfidence;
  resolvedTier: 'no-website' | 'heuristic' | 'ai-fallback' | 'fallback';
}

/**
 * Optional AI-assisted tier for genuinely inconclusive heuristic results
 * (Doc 20 §5). Not implemented until Module M3/M4 builds `AiService`
 * (packages/ai) — see DECISIONS.md D-005. `WebsiteStatusClassifier` works
 * correctly with no implementation provided; it just skips straight to the
 * documented low-confidence fallback.
 */
export interface AiFallbackClassifier {
  classify(input: { html: string; url: string }): Promise<'outdated' | 'present'>;
}
