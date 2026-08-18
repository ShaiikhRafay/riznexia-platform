'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveImageUrl } from '@/lib/image-utils';
import type { CtaStyle, SourcedImageRef, SourcedLink, SourcedText } from '@/lib/types';

export interface HeroProps {
  headline: SourcedText;
  subheadline?: SourcedText;
  backgroundImage?: SourcedImageRef;
  primaryCta?: SourcedLink;
  trustSignal?: SourcedText;
  mediaPosition: 'background' | 'left' | 'right' | 'none';
  contentAlignment: 'left' | 'center';
  ctaStyle: CtaStyle;
}

const CTA_VARIANT: Record<CtaStyle, 'solid' | 'outline' | 'floating' | 'banner'> = {
  'solid-button': 'solid',
  'outline-button': 'outline',
  'floating-action': 'floating',
  'banner-strip': 'banner',
};

export function Hero({
  headline,
  subheadline,
  backgroundImage,
  primaryCta,
  trustSignal,
  mediaPosition,
  contentAlignment,
  ctaStyle,
}: HeroProps) {
  const reduceMotion = useReducedMotion();
  const imageUrl = resolveImageUrl(backgroundImage?.value);
  const isBackgroundMedia = mediaPosition === 'background' && imageUrl;
  // No real photo to show (either this business has none, or the
  // deployment's photo key isn't configured) — a flat solid background
  // reads as broken/empty; a brand-color gradient reads as designed.
  const showGradientFallback = mediaPosition === 'background' && !imageUrl;

  return (
    <div
      className={
        isBackgroundMedia || showGradientFallback ? 'relative isolate overflow-hidden' : 'relative'
      }
    >
      {isBackgroundMedia && (
        <Image
          src={imageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-10 object-cover brightness-75"
        />
      )}
      {showGradientFallback && (
        <div className="bg-primary-accent-gradient absolute inset-0 -z-10" />
      )}

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`gap-token-md py-token-xl flex flex-col ${contentAlignment === 'center' ? 'items-center text-center' : 'items-start text-left'} ${
          isBackgroundMedia || showGradientFallback ? 'text-white' : ''
        }`}
      >
        <h1 className="font-heading max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          {headline.value}
        </h1>

        {subheadline && <p className="max-w-2xl text-lg opacity-90">{subheadline.value}</p>}

        {trustSignal && <Badge variant="outline">{trustSignal.value}</Badge>}

        {primaryCta?.value.label && (
          <Button asChild variant={CTA_VARIANT[ctaStyle]} className="mt-token-sm">
            <a
              href={
                primaryCta.value.targetComponentId
                  ? `#${primaryCta.value.targetComponentId}`
                  : undefined
              }
            >
              {primaryCta.value.label}
            </a>
          </Button>
        )}
      </motion.div>

      {mediaPosition !== 'background' && mediaPosition !== 'none' && imageUrl && (
        <div
          className={`mt-token-md relative aspect-video w-full overflow-hidden rounded-lg ${mediaPosition === 'left' ? 'md:order-first' : ''}`}
        >
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
