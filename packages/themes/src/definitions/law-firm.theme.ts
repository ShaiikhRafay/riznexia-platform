import type { ThemeDefinition, ThemeDefinitionContent } from '../provider/theme-provider.interface';
import { computeThemeHash } from '../provider/theme-hash';

const VERSION = 'v1.0';
const CONTENT: ThemeDefinitionContent = {
  industryCategories: ['law firm', 'attorney', 'lawyer', 'legal services', 'legal counsel'],
  layoutKeywords: ['authoritative', 'professional', 'serious', 'trustworthy', 'formal', 'polished'],
  componentSet: [
    'hero-banner',
    'practice-areas',
    'attorney-profiles',
    'case-results',
    'consultation-cta',
    'testimonial-carousel',
  ],
  navigationStyle: 'top-bar',
  heroStyle: 'minimal-text',
  ctaStyle: 'outline-button',
  cardStyle: 'flat-bordered',
  footerStyle: 'multi-column',
  animationLevel: 'none',
  imageStyle: 'photography-realistic',
  sectionOrder: [
    'hero',
    'about',
    'practice-areas',
    'attorneys',
    'results',
    'testimonials',
    'consultation-cta',
    'contact',
    'footer',
  ],
  accessibilityProfile: {
    contrastLevel: 'AAA',
    minTouchTargetPx: 48,
    reducedMotionSupport: true,
    altTextRequired: true,
  },
  mobilePreferences: { navigationPattern: 'top-tab', stackedLayout: true, tapTargetSizePx: 48 },
  sectionComponentMap: {
    hero: ['hero-banner'],
    about: [],
    'practice-areas': ['practice-areas'],
    attorneys: ['attorney-profiles'],
    results: ['case-results'],
    testimonials: ['testimonial-carousel'],
    'consultation-cta': ['consultation-cta'],
    contact: [],
    footer: [],
  },
};

export const lawFirmTheme: ThemeDefinition = {
  id: 'law-firm',
  name: 'Law Firm',
  version: VERSION,
  hash: computeThemeHash(VERSION, CONTENT),
  createdAt: '2026-07-30',
  updatedAt: '2026-07-30',
  content: CONTENT,
};
