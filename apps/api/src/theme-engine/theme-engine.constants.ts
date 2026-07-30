// Module M7 (founder's explicit requirement) — versions the SELECTION
// ENGINE (rules + scoring logic in this module and packages/themes'
// compatibility-scorer), distinct from an individual theme's own
// `themeVersion`. Bumping this happens when the scoring weights, minimum
// threshold, or selection algorithm itself changes — not when a theme
// definition's content changes.
export const THEME_ENGINE_VERSION = 'v1.0';
