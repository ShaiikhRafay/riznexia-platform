import { describe, expect, it } from 'vitest';
import { contrastRatio, WCAG_AA_NORMAL_TEXT_MIN_RATIO } from './color-contrast';

describe('contrastRatio', () => {
  it('returns 21 for pure black on pure white (maximum contrast)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('returns 1 for identical colors (no contrast)', () => {
    expect(contrastRatio('#8B4513', '#8B4513')).toBeCloseTo(1, 5);
  });

  it('is symmetric regardless of argument order', () => {
    expect(contrastRatio('#2F1B0C', '#FFF8DC')).toBeCloseTo(
      contrastRatio('#FFF8DC', '#2F1B0C')!,
      5,
    );
  });

  it('resolves 3-digit hex shorthand', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
  });

  it('returns null for an unparseable color', () => {
    expect(contrastRatio('rgb(0,0,0)', '#FFFFFF')).toBeNull();
    expect(contrastRatio('#FFFFFF', 'not-a-color')).toBeNull();
  });

  it('flags a low-contrast pair as below the WCAG AA normal-text threshold', () => {
    const ratio = contrastRatio('#F5DEB3', '#FFF8DC');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeLessThan(WCAG_AA_NORMAL_TEXT_MIN_RATIO);
  });

  it('confirms a real high-contrast brand pair passes the WCAG AA threshold', () => {
    const ratio = contrastRatio('#2F1B0C', '#FFF8DC');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_MIN_RATIO);
  });
});
