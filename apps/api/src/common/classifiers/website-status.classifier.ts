import { Inject, Injectable, Optional } from '@nestjs/common';
import type { WebsiteFetchResult } from '../adapters/website-fetch.adapter';
import type { AiFallbackClassifier, WebsiteStatusClassification } from './website-status.types';

export const AI_FALLBACK_CLASSIFIER = Symbol('AI_FALLBACK_CLASSIFIER');

const STALE_YEAR_THRESHOLD = 2; // a copyright year this many+ years behind "now" reads as stale
const COPYRIGHT_YEAR_PATTERN = /(?:copyright|©|\(c\))[^0-9]{0,10}(\d{4})(?:\s*[-–]\s*(\d{4}))?/i;
const VIEWPORT_META_PATTERN = /<meta[^>]+name=["']viewport["']/i;

type YearFreshness = 'fresh' | 'stale' | 'unknown';

// Heuristic-first, AI-assisted-fallback-second — Doc 20 §5, Doc 22 §5.
// `AiFallbackClassifier` is optional and unimplemented until Module M3/M4
// (DECISIONS.md D-005); when absent, an inconclusive heuristic read goes
// straight to the same low-confidence "outdated" fallback that an AI
// failure would also produce — no new behavior invented to paper over the
// gap.
@Injectable()
export class WebsiteStatusClassifier {
  constructor(
    @Optional() @Inject(AI_FALLBACK_CLASSIFIER) private readonly aiFallback?: AiFallbackClassifier,
  ) {}

  async classify(fetchResult: WebsiteFetchResult): Promise<WebsiteStatusClassification> {
    if (!fetchResult.ok || !fetchResult.html) {
      // A dead/unreachable site is a real signal, but a transient failure
      // isn't strong enough evidence to be "high confidence" — Doc 22 §10.
      return { status: 'outdated', confidence: 'low', resolvedTier: 'fallback' };
    }

    const score = this.heuristicScore(fetchResult);

    if (score <= -2) {
      return { status: 'outdated', confidence: 'high', resolvedTier: 'heuristic' };
    }
    if (score >= 2) {
      return { status: 'present', confidence: 'high', resolvedTier: 'heuristic' };
    }

    // Inconclusive — try the AI tier if it's wired in; otherwise fall
    // through to the documented low-confidence default (Doc 20 §5: fails
    // open toward inclusion, since missing a real opportunity costs more
    // than a rep spending 30 seconds ruling out a false positive).
    if (this.aiFallback) {
      try {
        const aiResult = await this.aiFallback.classify({
          html: fetchResult.html,
          url: fetchResult.finalUrl ?? '',
        });
        return { status: aiResult, confidence: 'high', resolvedTier: 'ai-fallback' };
      } catch {
        // AI tier failing is itself just another path to the same fallback.
      }
    }

    return { status: 'outdated', confidence: 'low', resolvedTier: 'fallback' };
  }

  private heuristicScore(fetchResult: WebsiteFetchResult): number {
    const html = fetchResult.html ?? '';
    let score = 0;

    const isHttps = fetchResult.finalUrl?.startsWith('https://') ?? false;
    score += isHttps ? 1 : -1;

    const hasViewportMeta = VIEWPORT_META_PATTERN.test(html);
    score += hasViewportMeta ? 1 : -1;

    const freshness = this.copyrightYearFreshness(html);
    if (freshness === 'fresh') score += 1;
    if (freshness === 'stale') score -= 1;
    // 'unknown' contributes no signal either way.

    return score;
  }

  private copyrightYearFreshness(html: string): YearFreshness {
    const match = html.match(COPYRIGHT_YEAR_PATTERN);
    if (!match) {
      return 'unknown';
    }
    const years = [match[1], match[2]].filter((y): y is string => Boolean(y)).map(Number);
    const mostRecentYear = Math.max(...years);
    const currentYear = new Date().getFullYear();

    return currentYear - mostRecentYear >= STALE_YEAR_THRESHOLD ? 'stale' : 'fresh';
  }
}
