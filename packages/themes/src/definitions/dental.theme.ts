import type { ThemeDefinition, ThemeDefinitionContent } from '../provider/theme-provider.interface';
import { computeThemeHash } from '../provider/theme-hash';

const VERSION = 'v1.0';
const CONTENT: ThemeDefinitionContent = {
  industryCategories: ['dental', 'dentist', 'orthodontics', 'dental clinic', 'family dentistry'],
  layoutKeywords: ['clean', 'clinical', 'trustworthy', 'friendly', 'professional', 'bright'],
  componentSet: [
    'hero-banner',
    'service-cards',
    'insurance-info',
    'appointment-cta',
    'testimonial-carousel',
    'faq-accordion',
  ],
  navigationStyle: 'top-bar',
  heroStyle: 'split-image-text',
  ctaStyle: 'solid-button',
  cardStyle: 'flat-bordered',
  footerStyle: 'multi-column',
  animationLevel: 'subtle',
  imageStyle: 'photography-realistic',
  sectionOrder: [
    'hero',
    'about',
    'services',
    'insurance',
    'testimonials',
    'faq',
    'appointment-cta',
    'contact',
    'footer',
  ],
  // Higher accessibility bar than the default — a medical-adjacent trust
  // signal deliberately baked into this theme's structural defaults.
  accessibilityProfile: {
    contrastLevel: 'AAA',
    minTouchTargetPx: 48,
    reducedMotionSupport: true,
    altTextRequired: true,
  },
  mobilePreferences: { navigationPattern: 'bottom-tab', stackedLayout: true, tapTargetSizePx: 48 },
  sectionComponentMap: {
    hero: ['hero-banner'],
    about: [],
    services: ['service-cards'],
    insurance: ['insurance-info'],
    testimonials: ['testimonial-carousel'],
    faq: ['faq-accordion'],
    'appointment-cta': ['appointment-cta'],
    contact: [],
    footer: [],
  },
};

export const dentalTheme: ThemeDefinition = {
  id: 'dental',
  name: 'Dental Practice',
  version: VERSION,
  hash: computeThemeHash(VERSION, CONTENT),
  createdAt: '2026-07-30',
  updatedAt: '2026-07-30',
  content: CONTENT,
};
