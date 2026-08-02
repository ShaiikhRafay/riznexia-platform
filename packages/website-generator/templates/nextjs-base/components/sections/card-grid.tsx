'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { gridColumnsClassName } from '@/lib/grid-columns';
import type { SourcedText, SourcedTextList } from '@/lib/types';

export interface CardGridProps {
  sectionTitle?: SourcedText;
  items: SourcedTextList;
  columns: { mobile: number; tablet: number; desktop: number };
}

export function CardGrid({ sectionTitle, items, columns }: CardGridProps) {
  const reduceMotion = useReducedMotion();
  const gridClass = gridColumnsClassName(columns);

  return (
    <div className="gap-token-md flex flex-col">
      {sectionTitle && (
        <h2 className="font-heading text-2xl font-semibold">{sectionTitle.value}</h2>
      )}
      <ul className={gridClass}>
        {items.value.map((item, index) => (
          <motion.li
            key={item}
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="list-none"
          >
            <Card>
              <CardContent className="pt-token-md">
                <CardTitle>{item}</CardTitle>
              </CardContent>
            </Card>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
