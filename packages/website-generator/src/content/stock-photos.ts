// Curated placeholder photography — used only when a business has no real
// Google Places photos of its own (founder's explicit instruction: ship a
// professional-looking placeholder now, swap in the client's real photos
// after the deal closes, never claim a stock photo is the business's own).
// One verified, real, freely-licensed (Unsplash License — free for
// commercial use, no attribution required) direct image URL per theme,
// keyed by the exact ThemeConfiguration.themeName each of the 8
// packages/themes definitions produces. Every URL was fetched and
// verified (HTTP 200, image/jpeg) before being added here — never a
// guessed or unverified link.
export const STOCK_PHOTO_BY_THEME_NAME: Record<string, string> = {
  Restaurant: 'https://images.unsplash.com/photo-1753727471014-efe38840c7c7',
  'Salon & Spa': 'https://images.unsplash.com/photo-1781450090585-1a511b7066d9',
  'Dental Practice': 'https://images.unsplash.com/photo-1704455306251-b4634215d98f',
  'Gym & Fitness': 'https://images.unsplash.com/photo-1758957646695-ec8bce3df462',
  'Real Estate': 'https://images.unsplash.com/photo-1760067537293-6b30141d6a52',
  'Medical Practice': 'https://images.unsplash.com/photo-1758691461957-474a7686e388',
  'Law Firm': 'https://images.unsplash.com/photo-1672678437993-8e14a6ccd38e',
  Corporate: 'https://images.unsplash.com/photo-1745015446589-7ee6f702d8c1',
};

/** The stock photo for a theme, or null if the theme name isn't in the curated set (never a fabricated fallback). */
export function stockPhotoForTheme(themeName: string): string | null {
  return STOCK_PHOTO_BY_THEME_NAME[themeName] ?? null;
}
