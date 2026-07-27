import type { WebsiteFetchResult } from '../adapters/website-fetch.adapter';
import type { AiFallbackClassifier } from './website-status.types';
import { WebsiteStatusClassifier } from './website-status.classifier';

function fetchResult(overrides: Partial<WebsiteFetchResult> = {}): WebsiteFetchResult {
  return {
    ok: true,
    statusCode: 200,
    html: '<html></html>',
    finalUrl: 'https://example.com/',
    errorReason: null,
    ...overrides,
  };
}

const currentYear = new Date().getFullYear();

describe('WebsiteStatusClassifier', () => {
  describe('dead/unreachable site', () => {
    it('classifies a failed fetch as outdated, low confidence, without running heuristics', async () => {
      const classifier = new WebsiteStatusClassifier();
      const result = await classifier.classify(fetchResult({ ok: false, html: null }));
      expect(result).toEqual({ status: 'outdated', confidence: 'low', resolvedTier: 'fallback' });
    });

    it('treats a successful response with no HTML body the same way', async () => {
      const classifier = new WebsiteStatusClassifier();
      const result = await classifier.classify(fetchResult({ ok: true, html: null }));
      expect(result.status).toBe('outdated');
      expect(result.confidence).toBe('low');
    });
  });

  describe('conclusive heuristic reads', () => {
    it('classifies a modern site (https + viewport + fresh copyright) as present, high confidence', async () => {
      const classifier = new WebsiteStatusClassifier();
      const html = `<html><head><meta name="viewport" content="width=device-width"></head><body>© ${currentYear} Joe's Diner</body></html>`;
      const result = await classifier.classify(
        fetchResult({ finalUrl: 'https://joesdiner.com/', html }),
      );
      expect(result).toEqual({ status: 'present', confidence: 'high', resolvedTier: 'heuristic' });
    });

    it('classifies a legacy site (http + no viewport + stale copyright) as outdated, high confidence', async () => {
      const classifier = new WebsiteStatusClassifier();
      const html = `<html><body>Copyright ${currentYear - 5} Joe's Diner</body></html>`;
      const result = await classifier.classify(
        fetchResult({ finalUrl: 'http://joesdiner.com/', html }),
      );
      expect(result).toEqual({ status: 'outdated', confidence: 'high', resolvedTier: 'heuristic' });
    });
  });

  describe('inconclusive heuristic reads', () => {
    const mixedSignalHtml = '<html><body>no copyright notice here</body></html>'; // https yes, viewport no, year unknown -> score 0

    it('falls back to outdated/low-confidence when no AI fallback is configured (DECISIONS.md D-005)', async () => {
      const classifier = new WebsiteStatusClassifier();
      const result = await classifier.classify(
        fetchResult({ finalUrl: 'https://joesdiner.com/', html: mixedSignalHtml }),
      );
      expect(result).toEqual({ status: 'outdated', confidence: 'low', resolvedTier: 'fallback' });
    });

    it('defers to the AI fallback tier when one is configured', async () => {
      const aiFallback: AiFallbackClassifier = { classify: jest.fn().mockResolvedValue('present') };
      const classifier = new WebsiteStatusClassifier(aiFallback);

      const result = await classifier.classify(
        fetchResult({ finalUrl: 'https://joesdiner.com/', html: mixedSignalHtml }),
      );

      expect(result).toEqual({
        status: 'present',
        confidence: 'high',
        resolvedTier: 'ai-fallback',
      });
      expect(aiFallback.classify).toHaveBeenCalledWith({
        html: mixedSignalHtml,
        url: 'https://joesdiner.com/',
      });
    });

    it('falls back to the default when the AI tier itself fails', async () => {
      const aiFallback: AiFallbackClassifier = {
        classify: jest.fn().mockRejectedValue(new Error('AI call failed')),
      };
      const classifier = new WebsiteStatusClassifier(aiFallback);

      const result = await classifier.classify(
        fetchResult({ finalUrl: 'https://joesdiner.com/', html: mixedSignalHtml }),
      );

      expect(result).toEqual({ status: 'outdated', confidence: 'low', resolvedTier: 'fallback' });
    });

    it('does not invoke the AI tier when the heuristic is already conclusive', async () => {
      const aiFallback: AiFallbackClassifier = { classify: jest.fn() };
      const classifier = new WebsiteStatusClassifier(aiFallback);
      const html = `<html><head><meta name="viewport" content="width=device-width"></head><body>© ${currentYear}</body></html>`;

      await classifier.classify(fetchResult({ finalUrl: 'https://joesdiner.com/', html }));

      expect(aiFallback.classify).not.toHaveBeenCalled();
    });
  });

  describe('copyright year extraction', () => {
    it.each([
      [`© ${currentYear}`, 'fresh'],
      [`(c) ${currentYear}`, 'fresh'],
      [`Copyright ${currentYear}`, 'fresh'],
      [`Copyright ${currentYear - 5}-${currentYear}`, 'fresh'], // range -> takes the most recent year
      [`© ${currentYear - 3}`, 'stale'],
    ])('reads "%s" as %s', async (snippet, expected) => {
      const classifier = new WebsiteStatusClassifier();
      // Pair the copyright signal with two neutral-losing signals so the
      // copyright year alone can't push the score past the inconclusive
      // band — isolates what we're actually testing.
      const html = `<html><body>${snippet}</body></html>`;
      const result = await classifier.classify(
        fetchResult({ finalUrl: 'http://joesdiner.com/', html }), // http (outdated-leaning) + no viewport (outdated-leaning)
      );
      if (expected === 'fresh') {
        // outdated(-1) + outdated(-1) + fresh(+1) = -1 -> still inconclusive, proves the year pulled it toward present
        expect(result.resolvedTier).toBe('fallback');
      } else {
        // outdated(-1) + outdated(-1) + stale(-1) = -3 -> conclusively outdated
        expect(result).toEqual({
          status: 'outdated',
          confidence: 'high',
          resolvedTier: 'heuristic',
        });
      }
    });

    it('treats a year exactly at the staleness threshold as stale', async () => {
      const classifier = new WebsiteStatusClassifier();
      const html = `<html><body>© ${currentYear - 2}</body></html>`;
      const result = await classifier.classify(
        fetchResult({ finalUrl: 'http://joesdiner.com/', html }),
      );
      expect(result.status).toBe('outdated');
      expect(result.confidence).toBe('high');
    });
  });
});
