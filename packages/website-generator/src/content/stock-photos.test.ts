import { describe, expect, it } from 'vitest';
import { STOCK_PHOTO_BY_THEME_NAME, stockPhotoForTheme } from './stock-photos';

describe('stockPhotoForTheme', () => {
  it('returns a real https://images.unsplash.com URL for every one of the 8 real theme names', () => {
    const themeNames = [
      'Restaurant',
      'Salon & Spa',
      'Dental Practice',
      'Gym & Fitness',
      'Real Estate',
      'Medical Practice',
      'Law Firm',
      'Corporate',
    ];
    expect(Object.keys(STOCK_PHOTO_BY_THEME_NAME).sort()).toEqual([...themeNames].sort());
    for (const name of themeNames) {
      const url = stockPhotoForTheme(name);
      expect(url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
    }
  });

  it('returns null for an unrecognized theme name, never a fabricated fallback', () => {
    expect(stockPhotoForTheme('Not A Real Theme')).toBeNull();
  });
});
