import { Button } from '@/components/ui/button';
import type { CtaStyle, SourcedLink, SourcedText } from '@/lib/types';

export interface CtaBannerProps {
  ctaText: SourcedText;
  ctaLink: SourcedLink;
  supportingText?: SourcedText;
  ctaStyle: CtaStyle;
}

const CTA_VARIANT: Record<CtaStyle, 'solid' | 'outline' | 'floating' | 'banner'> = {
  'solid-button': 'solid',
  'outline-button': 'outline',
  'floating-action': 'floating',
  'banner-strip': 'banner',
};

export function CtaBanner({ ctaText, ctaLink, supportingText, ctaStyle }: CtaBannerProps) {
  return (
    <div className="gap-token-sm border-border bg-secondary px-token-md py-token-lg flex flex-col items-center rounded-lg border text-center">
      {supportingText && <p className="text-base opacity-80">{supportingText.value}</p>}
      <Button asChild variant={CTA_VARIANT[ctaStyle]}>
        <a
          href={
            ctaLink.value.targetComponentId
              ? `#${ctaLink.value.targetComponentId}`
              : ctaLink.value.url
          }
        >
          {ctaText.value}
        </a>
      </Button>
    </div>
  );
}
