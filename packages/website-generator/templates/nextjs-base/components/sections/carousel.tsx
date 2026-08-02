'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SourcedText, SourcedTextList } from '@/lib/types';

export interface CarouselProps {
  sectionTitle?: SourcedText;
  items: SourcedTextList;
}

// A single-item-at-a-time carousel — real keyboard support (prev/next are
// <button>s, live region announces the active slide) rather than a
// swipe-only widget. Respects prefers-reduced-motion by skipping the
// slide transition animation.
export function Carousel({ sectionTitle, items }: CarouselProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const total = items.value.length;

  if (total === 0) {
    return null;
  }

  const goTo = (next: number) => setIndex(((next % total) + total) % total);

  return (
    <div className="gap-token-md flex flex-col">
      {sectionTitle && (
        <h2 className="font-heading text-2xl font-semibold">{sectionTitle.value}</h2>
      )}

      <div
        className="relative"
        role="region"
        aria-roledescription="carousel"
        aria-label={sectionTitle?.value ?? 'Testimonials'}
      >
        <div aria-live="polite" className="sr-only">
          {`Showing ${index + 1} of ${total}`}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduceMotion ? undefined : { opacity: 0, x: 24 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="pt-token-md text-lg italic">
                &ldquo;{items.value[index]}&rdquo;
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {total > 1 && (
          <div className="mt-token-sm gap-token-sm flex items-center justify-center">
            <Button
              type="button"
              variant="outline"
              aria-label="Previous testimonial"
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Next testimonial"
              onClick={() => goTo(index + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
