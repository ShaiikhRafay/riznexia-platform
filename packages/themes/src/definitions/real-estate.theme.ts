import type { ThemeDefinition, ThemeDefinitionContent } from '../provider/theme-provider.interface';
import { computeThemeHash } from '../provider/theme-hash';

const VERSION = 'v1.0';
const CONTENT: ThemeDefinitionContent = {
  industryCategories: [
    'real estate',
    'realtor',
    'property management',
    'real estate agency',
    'real estate agent',
  ],
  layoutKeywords: ['polished', 'aspirational', 'spacious', 'premium', 'sophisticated', 'upscale'],
  componentSet: [
    'hero-banner',
    'listing-grid',
    'agent-profiles',
    'property-search',
    'inquiry-cta',
    'testimonial-carousel',
  ],
  navigationStyle: 'top-bar',
  heroStyle: 'carousel',
  ctaStyle: 'solid-button',
  cardStyle: 'elevated-shadow',
  footerStyle: 'multi-column',
  animationLevel: 'moderate',
  imageStyle: 'photography-realistic',
  sectionOrder: [
    'hero',
    'listings',
    'search',
    'about',
    'agents',
    'testimonials',
    'inquiry-cta',
    'contact',
    'footer',
  ],
  accessibilityProfile: {
    contrastLevel: 'AA',
    minTouchTargetPx: 44,
    reducedMotionSupport: true,
    altTextRequired: true,
  },
  mobilePreferences: { navigationPattern: 'hamburger', stackedLayout: true, tapTargetSizePx: 48 },
  sectionComponentMap: {
    hero: ['hero-banner'],
    listings: ['listing-grid'],
    search: ['property-search'],
    about: [],
    agents: ['agent-profiles'],
    testimonials: ['testimonial-carousel'],
    'inquiry-cta': ['inquiry-cta'],
    contact: [],
    footer: [],
  },
};

export const realEstateTheme: ThemeDefinition = {
  id: 'real-estate',
  name: 'Real Estate',
  version: VERSION,
  hash: computeThemeHash(VERSION, CONTENT),
  createdAt: '2026-07-30',
  updatedAt: '2026-07-30',
  content: CONTENT,
};
