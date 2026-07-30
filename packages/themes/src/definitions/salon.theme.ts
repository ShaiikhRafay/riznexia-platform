import type { ThemeDefinition, ThemeDefinitionContent } from '../provider/theme-provider.interface';
import { computeThemeHash } from '../provider/theme-hash';

const VERSION = 'v1.0';
const CONTENT: ThemeDefinitionContent = {
  industryCategories: [
    'salon',
    'hair salon',
    'nail salon',
    'spa',
    'beauty',
    'barber',
    'barbershop',
  ],
  layoutKeywords: ['elegant', 'chic', 'soft', 'modern', 'pampering', 'relaxing'],
  componentSet: [
    'hero-banner',
    'service-menu',
    'gallery-grid',
    'staff-profiles',
    'booking-cta',
    'testimonial-carousel',
  ],
  navigationStyle: 'top-bar',
  heroStyle: 'split-image-text',
  ctaStyle: 'outline-button',
  cardStyle: 'minimal-divider',
  footerStyle: 'simple-centered',
  animationLevel: 'subtle',
  imageStyle: 'photography-realistic',
  sectionOrder: [
    'hero',
    'about',
    'services',
    'gallery',
    'staff',
    'testimonials',
    'booking-cta',
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
    services: ['service-menu'],
    gallery: ['gallery-grid'],
    staff: ['staff-profiles'],
    testimonials: ['testimonial-carousel'],
    'booking-cta': ['booking-cta'],
    contact: [],
    footer: [],
  },
};

export const salonTheme: ThemeDefinition = {
  id: 'salon',
  name: 'Salon & Spa',
  version: VERSION,
  hash: computeThemeHash(VERSION, CONTENT),
  createdAt: '2026-07-30',
  updatedAt: '2026-07-30',
  content: CONTENT,
};
