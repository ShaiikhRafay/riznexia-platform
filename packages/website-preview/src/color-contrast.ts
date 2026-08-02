// Module M9 — a real WCAG 2.1 contrast-ratio calculation (relative
// luminance formula, §1.4.3), not a heuristic proxy. Pure math over two
// hex color strings — deterministic, no rendering/screenshotting/network
// involved, unlike a Lighthouse-style computed-style inspection.

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return null;
  }
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function relativeLuminanceChannel(channel8Bit: number): number {
  const channel = channel8Bit / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = relativeLuminanceChannel(rgb.r);
  const g = relativeLuminanceChannel(rgb.g);
  const b = relativeLuminanceChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two colors, 1 (no contrast) to 21 (max
 * contrast, black on white). Returns `null` when either color isn't a
 * parseable hex string (e.g. a named CSS color or `rgb()` string) —
 * ThemeConfiguration.colorPalette values are AI-produced and not
 * guaranteed to be hex, so an unparseable color is a real, distinct
 * finding (not silently treated as passing or failing).
 */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  if (luminanceA === null || luminanceB === null) return null;

  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG 2.1 AA thresholds (§1.4.3) — normal text needs 4.5:1, large text
// (18pt+/14pt+bold) needs 3:1. Headings/CTAs commonly qualify as "large
// text"; body copy doesn't — AccessibilityValidator uses the stricter
// normal-text threshold since it can't know a given text's rendered size
// from color tokens alone.
export const WCAG_AA_NORMAL_TEXT_MIN_RATIO = 4.5;
export const WCAG_AA_LARGE_TEXT_MIN_RATIO = 3;
