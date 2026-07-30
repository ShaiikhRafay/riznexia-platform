import type { ThemeDefinition, ThemeDefinitionContent } from '../provider/theme-provider.interface';
import { computeThemeHash } from '../provider/theme-hash';

const VERSION = 'v1.0';
// The universal fallback (Doc 21 M7 architecture review §4) — used when no
// other registered theme scores above the minimum compatibility threshold.
// Its industryCategories list is deliberately generic rather than empty,
// so it always contributes a non-zero industry-compatibility score for any
// business, which is what makes it a real fallback rather than a themeId
// that could itself fail the compatibility gate.
const CONTENT: ThemeDefinitionContent = {
  industryCategories: [
    'corporate',
    'professional services',
    'consulting',
    'general business',
    'other',
    'service business',
  ],
  layoutKeywords: ['clean', 'modern', 'professional', 'minimal', 'structured', 'straightforward'],
  componentSet: [
    'hero-banner',
    'service-cards',
    'about-section',
    'team-profiles',
    'contact-cta',
    'client-logos',
  ],
  navigationStyle: 'top-bar',
  heroStyle: 'minimal-text',
  ctaStyle: 'solid-button',
  cardStyle: 'flat-bordered',
  footerStyle: 'simple-centered',
  animationLevel: 'subtle',
  imageStyle: 'minimal-graphic',
  sectionOrder: [
    'hero',
    'about',
    'services',
    'team',
    'clients',
    'contact-cta',
    'contact',
    'footer',
  ],
  accessibilityProfile: {
    contrastLevel: 'AA',
    minTouchTargetPx: 44,
    reducedMotionSupport: true,
    altTextRequired: true,
  },
  mobilePreferences: { navigationPattern: 'top-tab', stackedLayout: true, tapTargetSizePx: 44 },
  sectionComponentMap: {
    hero: ['hero-banner'],
    about: ['about-section'],
    services: ['service-cards'],
    team: ['team-profiles'],
    clients: ['client-logos'],
    'contact-cta': ['contact-cta'],
    contact: [],
    footer: [],
  },
};

export const corporateTheme: ThemeDefinition = {
  id: 'corporate',
  name: 'Corporate',
  version: VERSION,
  hash: computeThemeHash(VERSION, CONTENT),
  createdAt: '2026-07-30',
  updatedAt: '2026-07-30',
  content: CONTENT,
};
