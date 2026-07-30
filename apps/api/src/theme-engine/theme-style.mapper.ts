import {
  AnimationLevel as PrismaAnimationLevel,
  CardStyle as PrismaCardStyle,
  CtaStyle as PrismaCtaStyle,
  FooterStyle as PrismaFooterStyle,
  HeroStyle as PrismaHeroStyle,
  ImageStyle as PrismaImageStyle,
  NavigationStyle as PrismaNavigationStyle,
} from '@riznexia/db';
import type {
  AnimationLevel,
  CardStyle,
  CtaStyle,
  FooterStyle,
  HeroStyle,
  ImageStyle,
  NavigationStyle,
} from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split used throughout the codebase
// (business.mapper.ts, place-sync-job-response.dto.ts). packages/themes'
// ThemeDefinitionContent uses the lowercase API shape directly (it's
// Prisma-free, per D-042's "packages/ai/themes must stay usable outside
// apps/api" precedent) — these maps are the write/read boundary.
const API_TO_PRISMA_NAVIGATION: Record<NavigationStyle, PrismaNavigationStyle> = {
  'top-bar': PrismaNavigationStyle.TOP_BAR,
  'top-bar-sticky': PrismaNavigationStyle.TOP_BAR_STICKY,
  sidebar: PrismaNavigationStyle.SIDEBAR,
  'minimal-hamburger': PrismaNavigationStyle.MINIMAL_HAMBURGER,
};
const PRISMA_TO_API_NAVIGATION: Record<PrismaNavigationStyle, NavigationStyle> = {
  [PrismaNavigationStyle.TOP_BAR]: 'top-bar',
  [PrismaNavigationStyle.TOP_BAR_STICKY]: 'top-bar-sticky',
  [PrismaNavigationStyle.SIDEBAR]: 'sidebar',
  [PrismaNavigationStyle.MINIMAL_HAMBURGER]: 'minimal-hamburger',
};

const API_TO_PRISMA_HERO: Record<HeroStyle, PrismaHeroStyle> = {
  'full-bleed-image': PrismaHeroStyle.FULL_BLEED_IMAGE,
  'split-image-text': PrismaHeroStyle.SPLIT_IMAGE_TEXT,
  'video-background': PrismaHeroStyle.VIDEO_BACKGROUND,
  carousel: PrismaHeroStyle.CAROUSEL,
  'minimal-text': PrismaHeroStyle.MINIMAL_TEXT,
};
const PRISMA_TO_API_HERO: Record<PrismaHeroStyle, HeroStyle> = {
  [PrismaHeroStyle.FULL_BLEED_IMAGE]: 'full-bleed-image',
  [PrismaHeroStyle.SPLIT_IMAGE_TEXT]: 'split-image-text',
  [PrismaHeroStyle.VIDEO_BACKGROUND]: 'video-background',
  [PrismaHeroStyle.CAROUSEL]: 'carousel',
  [PrismaHeroStyle.MINIMAL_TEXT]: 'minimal-text',
};

const API_TO_PRISMA_CTA: Record<CtaStyle, PrismaCtaStyle> = {
  'solid-button': PrismaCtaStyle.SOLID_BUTTON,
  'outline-button': PrismaCtaStyle.OUTLINE_BUTTON,
  'floating-action': PrismaCtaStyle.FLOATING_ACTION,
  'banner-strip': PrismaCtaStyle.BANNER_STRIP,
};
const PRISMA_TO_API_CTA: Record<PrismaCtaStyle, CtaStyle> = {
  [PrismaCtaStyle.SOLID_BUTTON]: 'solid-button',
  [PrismaCtaStyle.OUTLINE_BUTTON]: 'outline-button',
  [PrismaCtaStyle.FLOATING_ACTION]: 'floating-action',
  [PrismaCtaStyle.BANNER_STRIP]: 'banner-strip',
};

const API_TO_PRISMA_CARD: Record<CardStyle, PrismaCardStyle> = {
  'elevated-shadow': PrismaCardStyle.ELEVATED_SHADOW,
  'flat-bordered': PrismaCardStyle.FLAT_BORDERED,
  'minimal-divider': PrismaCardStyle.MINIMAL_DIVIDER,
  'image-overlay': PrismaCardStyle.IMAGE_OVERLAY,
};
const PRISMA_TO_API_CARD: Record<PrismaCardStyle, CardStyle> = {
  [PrismaCardStyle.ELEVATED_SHADOW]: 'elevated-shadow',
  [PrismaCardStyle.FLAT_BORDERED]: 'flat-bordered',
  [PrismaCardStyle.MINIMAL_DIVIDER]: 'minimal-divider',
  [PrismaCardStyle.IMAGE_OVERLAY]: 'image-overlay',
};

const API_TO_PRISMA_FOOTER: Record<FooterStyle, PrismaFooterStyle> = {
  'multi-column': PrismaFooterStyle.MULTI_COLUMN,
  'simple-centered': PrismaFooterStyle.SIMPLE_CENTERED,
  'newsletter-cta': PrismaFooterStyle.NEWSLETTER_CTA,
};
const PRISMA_TO_API_FOOTER: Record<PrismaFooterStyle, FooterStyle> = {
  [PrismaFooterStyle.MULTI_COLUMN]: 'multi-column',
  [PrismaFooterStyle.SIMPLE_CENTERED]: 'simple-centered',
  [PrismaFooterStyle.NEWSLETTER_CTA]: 'newsletter-cta',
};

const API_TO_PRISMA_ANIMATION: Record<AnimationLevel, PrismaAnimationLevel> = {
  none: PrismaAnimationLevel.NONE,
  subtle: PrismaAnimationLevel.SUBTLE,
  moderate: PrismaAnimationLevel.MODERATE,
  expressive: PrismaAnimationLevel.EXPRESSIVE,
};
const PRISMA_TO_API_ANIMATION: Record<PrismaAnimationLevel, AnimationLevel> = {
  [PrismaAnimationLevel.NONE]: 'none',
  [PrismaAnimationLevel.SUBTLE]: 'subtle',
  [PrismaAnimationLevel.MODERATE]: 'moderate',
  [PrismaAnimationLevel.EXPRESSIVE]: 'expressive',
};

const API_TO_PRISMA_IMAGE: Record<ImageStyle, PrismaImageStyle> = {
  'photography-realistic': PrismaImageStyle.PHOTOGRAPHY_REALISTIC,
  illustration: PrismaImageStyle.ILLUSTRATION,
  'icon-driven': PrismaImageStyle.ICON_DRIVEN,
  'minimal-graphic': PrismaImageStyle.MINIMAL_GRAPHIC,
};
const PRISMA_TO_API_IMAGE: Record<PrismaImageStyle, ImageStyle> = {
  [PrismaImageStyle.PHOTOGRAPHY_REALISTIC]: 'photography-realistic',
  [PrismaImageStyle.ILLUSTRATION]: 'illustration',
  [PrismaImageStyle.ICON_DRIVEN]: 'icon-driven',
  [PrismaImageStyle.MINIMAL_GRAPHIC]: 'minimal-graphic',
};

export function toPrismaNavigationStyle(value: NavigationStyle): PrismaNavigationStyle {
  return API_TO_PRISMA_NAVIGATION[value];
}
export function toApiNavigationStyle(value: PrismaNavigationStyle): NavigationStyle {
  return PRISMA_TO_API_NAVIGATION[value];
}
export function toPrismaHeroStyle(value: HeroStyle): PrismaHeroStyle {
  return API_TO_PRISMA_HERO[value];
}
export function toApiHeroStyle(value: PrismaHeroStyle): HeroStyle {
  return PRISMA_TO_API_HERO[value];
}
export function toPrismaCtaStyle(value: CtaStyle): PrismaCtaStyle {
  return API_TO_PRISMA_CTA[value];
}
export function toApiCtaStyle(value: PrismaCtaStyle): CtaStyle {
  return PRISMA_TO_API_CTA[value];
}
export function toPrismaCardStyle(value: CardStyle): PrismaCardStyle {
  return API_TO_PRISMA_CARD[value];
}
export function toApiCardStyle(value: PrismaCardStyle): CardStyle {
  return PRISMA_TO_API_CARD[value];
}
export function toPrismaFooterStyle(value: FooterStyle): PrismaFooterStyle {
  return API_TO_PRISMA_FOOTER[value];
}
export function toApiFooterStyle(value: PrismaFooterStyle): FooterStyle {
  return PRISMA_TO_API_FOOTER[value];
}
export function toPrismaAnimationLevel(value: AnimationLevel): PrismaAnimationLevel {
  return API_TO_PRISMA_ANIMATION[value];
}
export function toApiAnimationLevel(value: PrismaAnimationLevel): AnimationLevel {
  return PRISMA_TO_API_ANIMATION[value];
}
export function toPrismaImageStyle(value: ImageStyle): PrismaImageStyle {
  return API_TO_PRISMA_IMAGE[value];
}
export function toApiImageStyle(value: PrismaImageStyle): ImageStyle {
  return PRISMA_TO_API_IMAGE[value];
}
