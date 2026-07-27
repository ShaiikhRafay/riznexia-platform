// Maps our internal category slugs (Doc 06 §"category") to the human-
// readable term used to build a Places Text Search (New) `textQuery`
// string (e.g. "restaurants in Karachi") — deliberately a data lookup,
// not inline string logic, so adding a category is a one-line change
// (Doc 22 §9).
const CATEGORY_SEARCH_TERMS: Record<string, string> = {
  restaurant: 'restaurants',
  cafe: 'cafes',
  salon: 'hair salons',
  clinic: 'medical clinics',
  hotel: 'hotels',
  gym: 'gyms',
  law_firm: 'law firms',
  real_estate_agency: 'real estate agencies',
};

export function categoryToSearchTerm(category: string): string {
  return CATEGORY_SEARCH_TERMS[category] ?? category;
}

export function isKnownCategory(category: string): boolean {
  return category in CATEGORY_SEARCH_TERMS;
}

export function knownCategories(): string[] {
  return Object.keys(CATEGORY_SEARCH_TERMS);
}
