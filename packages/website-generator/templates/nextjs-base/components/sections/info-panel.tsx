import Image from 'next/image';
import { resolveImageUrl } from '@/lib/image-utils';
import type { SourcedImageRef, SourcedText } from '@/lib/types';

export interface InfoPanelProps {
  heading?: SourcedText;
  body: SourcedText;
  image?: SourcedImageRef;
}

export function InfoPanel({ heading, body, image }: InfoPanelProps) {
  const imageUrl = resolveImageUrl(image?.value);

  return (
    <div
      className={
        imageUrl ? 'gap-token-lg grid md:grid-cols-2 md:items-center' : 'gap-token-md flex flex-col'
      }
    >
      <div className="gap-token-sm flex flex-col">
        {heading && <h2 className="font-heading text-2xl font-semibold">{heading.value}</h2>}
        <p className="text-base leading-relaxed opacity-90">{body.value}</p>
      </div>
      {imageUrl && (
        <div className="relative aspect-video overflow-hidden rounded-lg">
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
