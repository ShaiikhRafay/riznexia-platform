import type { ThemeDefinition, ThemeDefinitionContent } from '../provider/theme-provider.interface';
import { computeThemeHash } from '../provider/theme-hash';

const VERSION = 'v1.0';
const CONTENT: ThemeDefinitionContent = {
  industryCategories: [
    'gym',
    'fitness',
    'crossfit',
    'personal training',
    'yoga studio',
    'fitness studio',
  ],
  layoutKeywords: ['bold', 'energetic', 'dynamic', 'motivating', 'vibrant', 'intense'],
  componentSet: [
    'hero-banner',
    'class-schedule',
    'trainer-profiles',
    'pricing-plans',
    'membership-cta',
    'testimonial-carousel',
  ],
  navigationStyle: 'top-bar-sticky',
  heroStyle: 'video-background',
  ctaStyle: 'floating-action',
  cardStyle: 'elevated-shadow',
  footerStyle: 'multi-column',
  animationLevel: 'expressive',
  imageStyle: 'photography-realistic',
  sectionOrder: [
    'hero',
    'about',
    'classes',
    'trainers',
    'pricing',
    'testimonials',
    'membership-cta',
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
    classes: ['class-schedule'],
    trainers: ['trainer-profiles'],
    pricing: ['pricing-plans'],
    testimonials: ['testimonial-carousel'],
    'membership-cta': ['membership-cta'],
    contact: [],
    footer: [],
  },
};

export const gymTheme: ThemeDefinition = {
  id: 'gym',
  name: 'Gym & Fitness',
  version: VERSION,
  hash: computeThemeHash(VERSION, CONTENT),
  createdAt: '2026-07-30',
  updatedAt: '2026-07-30',
  content: CONTENT,
};
