import type { ThemeDefinition, ThemeDefinitionContent } from '../provider/theme-provider.interface';
import { computeThemeHash } from '../provider/theme-hash';

const VERSION = 'v1.0';
const CONTENT: ThemeDefinitionContent = {
  industryCategories: [
    'medical clinic',
    'doctor',
    'physician',
    'urgent care',
    'healthcare',
    'family medicine',
    'clinic',
  ],
  layoutKeywords: ['calm', 'clean', 'reassuring', 'clinical', 'accessible', 'caring'],
  componentSet: [
    'hero-banner',
    'service-cards',
    'provider-profiles',
    'insurance-info',
    'appointment-cta',
    'patient-resources',
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
    'providers',
    'insurance',
    'resources',
    'appointment-cta',
    'contact',
    'footer',
  ],
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
    providers: ['provider-profiles'],
    insurance: ['insurance-info'],
    resources: ['patient-resources'],
    'appointment-cta': ['appointment-cta'],
    contact: [],
    footer: [],
  },
};

export const medicalTheme: ThemeDefinition = {
  id: 'medical',
  name: 'Medical Practice',
  version: VERSION,
  hash: computeThemeHash(VERSION, CONTENT),
  createdAt: '2026-07-30',
  updatedAt: '2026-07-30',
  content: CONTENT,
};
