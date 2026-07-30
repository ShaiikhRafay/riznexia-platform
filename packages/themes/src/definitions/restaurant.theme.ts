import type { ThemeDefinition, ThemeDefinitionContent } from '../provider/theme-provider.interface';
import { computeThemeHash } from '../provider/theme-hash';

const VERSION = 'v1.0';
const CONTENT: ThemeDefinitionContent = {
  industryCategories: [
    'restaurant',
    'cafe',
    'bakery',
    'catering',
    'food truck',
    'diner',
    'bar',
    'bistro',
  ],
  layoutKeywords: ['warm', 'inviting', 'image-forward', 'casual', 'cozy', 'vibrant'],
  componentSet: [
    'hero-banner',
    'menu-showcase',
    'gallery-grid',
    'testimonial-carousel',
    'reservation-cta',
    'map-embed',
  ],
  navigationStyle: 'top-bar-sticky',
  heroStyle: 'full-bleed-image',
  ctaStyle: 'solid-button',
  cardStyle: 'image-overlay',
  footerStyle: 'multi-column',
  animationLevel: 'moderate',
  imageStyle: 'photography-realistic',
  sectionOrder: [
    'hero',
    'about',
    'menu',
    'gallery',
    'testimonials',
    'reservation-cta',
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
    about: [],
    menu: ['menu-showcase'],
    gallery: ['gallery-grid'],
    testimonials: ['testimonial-carousel'],
    'reservation-cta': ['reservation-cta'],
    contact: ['map-embed'],
    footer: [],
  },
};

export const restaurantTheme: ThemeDefinition = {
  id: 'restaurant',
  name: 'Restaurant',
  version: VERSION,
  hash: computeThemeHash(VERSION, CONTENT),
  createdAt: '2026-07-30',
  updatedAt: '2026-07-30',
  content: CONTENT,
};
