import type { StructuredDataBinding } from '@riznexia/shared-types';

// Module M8.4 — converts each ContentManifest.structuredData binding (a
// generic { type, data: Record<string, ContentValue> } shape) into a real
// schema.org JSON-LD object, emitted in app/page.tsx as a plain
// `<script type="application/ld+json">` (the idiomatic Next.js App
// Router pattern) rather than through next-seo's per-type JSON-LD
// components — those require decomposed fields (e.g. address as
// {streetAddress, addressLocality, ...}, geo as {latitude, longitude})
// that M8.3's binder never produced (it only ever had a single combined
// "street, city" string and no separate lat/lng-to-address split), and
// forcing that decomposition here would mean inventing structure the
// data doesn't actually have. `address` as a plain string is valid
// schema.org (the `address` property's range includes `Text` directly).
//
// One honest limitation: `aggregateRating` is bound (Module M8.3) as a
// single human-readable string ("4.5/5 (120 reviews)"), not decomposed
// ratingValue/reviewCount numbers — schema.org expects an AggregateRating
// object there. Rather than parse that string back into numbers (fragile,
// and the assembler has no access to the original Business record to
// re-derive it correctly), it is emitted verbatim as a plain string field.
export function structuredDataToJsonLd(binding: StructuredDataBinding): Record<string, unknown> {
  switch (binding.type) {
    case 'BreadcrumbList': {
      const items = binding.data.itemListElement?.value as
        { label: string; targetComponentId: string }[] | undefined;
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: (items ?? []).map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          item: `#${item.targetComponentId}`,
        })),
      };
    }

    case 'FAQPage': {
      const items = binding.data.items?.value as string[] | undefined;
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: (items ?? []).map((item) => ({
          '@type': 'Question',
          name: item,
          acceptedAnswer: { '@type': 'Answer', text: item },
        })),
      };
    }

    case 'LocalBusiness':
    case 'Organization':
    default: {
      const fields: Record<string, unknown> = {};
      for (const [key, contentValue] of Object.entries(binding.data)) {
        fields[key] = (contentValue as { value: unknown }).value;
      }
      return { '@context': 'https://schema.org', '@type': binding.type, ...fields };
    }
  }
}
