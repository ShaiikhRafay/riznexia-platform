'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { gridColumnsClassName } from '@/lib/grid-columns';
import { resolvePlacePhotoUrl } from '@/lib/image-utils';
import type { SourcedImageRefList, SourcedText, SourcedTextList } from '@/lib/types';

export interface CardGridProps {
  sectionTitle?: SourcedText;
  items: SourcedTextList;
  // Only ever bound for a Gallery-classified card-grid with real
  // Business.photos (Content Binding's own 'card-grid.images' rule) —
  // every other card-grid (Services, etc.) never receives this prop and
  // renders exactly as before, text-only.
  images?: SourcedImageRefList;
  columns: { mobile: number; tablet: number; desktop: number };
}

export function CardGrid({ sectionTitle, items, images, columns }: CardGridProps) {
  const reduceMotion = useReducedMotion();
  const gridClass = gridColumnsClassName(columns);
  const photoUrls = images?.value.map((photo) => resolvePlacePhotoUrl(photo.photoReference)) ?? [];

  return (
    <div className="gap-token-md flex flex-col">
      {sectionTitle && (
        <h2 className="font-heading text-2xl font-semibold">{sectionTitle.value}</h2>
      )}
      <ul className={gridClass}>
        {items.value.map((item, index) => {
          const photoUrl = photoUrls[index] ?? null;
          return (
            <motion.li
              key={item}
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="list-none"
            >
              <Card className="overflow-hidden p-0">
                {photoUrl && (
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={photoUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <CardContent className="pt-token-md">
                  <CardTitle>{item}</CardTitle>
                </CardContent>
              </Card>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
