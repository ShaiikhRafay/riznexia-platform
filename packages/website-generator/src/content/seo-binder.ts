import type {
  BusinessAnalysisOutput,
  BusinessContactInfo,
  ContentValue,
  SeoMetadata,
  StructuredDataBinding,
} from '@riznexia/shared-types';
import { titleCase } from './content-binding-rules';

// Module M8.3 (DECISIONS.md D-061+) — SEO metadata and schema.org
// structured-data mapping. `keywords`/`localSeoSuggestions` are verbatim
// BusinessAnalysis fields. `metaDescription` is `businessSummary`
// verbatim — no template needed, it already reads like a description.
// `metaTitle` has no single upstream field, so it's assembled via a fixed,
// non-creative template purely from real fields (founder's resolved
// fork) — every word traces to a real source, the template itself never
// varies.
export function bindSeoMetadata(
  brandBrief: BusinessAnalysisOutput,
  business: BusinessContactInfo,
): SeoMetadata {
  return {
    keywords: { value: brandBrief.seoKeywords, source: 'BusinessAnalysis.brandBrief.seoKeywords' },
    localSeoSuggestions: {
      value: brandBrief.localSeoSuggestions,
      source: 'BusinessAnalysis.brandBrief.localSeoSuggestions',
    },
    metaTitle: {
      value: `${business.businessName} | ${brandBrief.industry} in ${business.city}`,
      source: 'Business.businessName+BusinessAnalysis.brandBrief.industry+Business.city',
    },
    metaDescription: {
      value: brandBrief.businessSummary,
      source: 'BusinessAnalysis.brandBrief.businessSummary',
    },
  };
}

// LocalBusiness/Organization are built directly from real Business fields.
// BreadcrumbList is built from the site's own section navigation (Home +
// every real, theme-derived section) — the only page hierarchy this
// pipeline knows about. FAQPage is added only "when applicable" (founder's
// literal instruction) — i.e. only if a real, resolved FAQ binding exists
// somewhere in componentContent; since no FAQ data source exists anywhere
// in this pipeline today (accordion.items is always unresolved), this
// never fires yet — correctly reflecting the missing data rather than
// fabricating placeholder Q&A pairs.
export function bindStructuredData(
  business: BusinessContactInfo,
  pageStructureSectionIds: string[],
  faqItems: string[] | null,
): StructuredDataBinding[] {
  const bindings: StructuredDataBinding[] = [];

  const localBusinessData: Record<string, ContentValue> = {
    name: { value: business.businessName, source: 'Business.businessName' },
    address: {
      value: `${business.address}, ${business.city}`,
      source: 'Business.address+Business.city',
    },
  };
  if (business.phone) {
    localBusinessData.telephone = { value: business.phone, source: 'Business.phone' };
  }
  if (business.rating !== null && business.reviewCount !== null) {
    localBusinessData.aggregateRating = {
      value: `${business.rating}/5 (${business.reviewCount} reviews)`,
      source: 'Business.rating+Business.reviewCount',
    };
  }
  if (business.googleBusinessUrl) {
    localBusinessData.url = {
      value: business.googleBusinessUrl,
      source: 'Business.googleBusinessUrl',
    };
  }
  bindings.push({ type: 'LocalBusiness', data: localBusinessData });

  const organizationData: Record<string, ContentValue> = {
    name: { value: business.businessName, source: 'Business.businessName' },
  };
  if (business.googleBusinessUrl) {
    organizationData.url = {
      value: business.googleBusinessUrl,
      source: 'Business.googleBusinessUrl',
    };
  }
  bindings.push({ type: 'Organization', data: organizationData });

  const breadcrumbSectionIds = pageStructureSectionIds.filter(
    (sectionId) => sectionId !== 'footer',
  );
  if (breadcrumbSectionIds.length > 0) {
    bindings.push({
      type: 'BreadcrumbList',
      data: {
        itemListElement: {
          // "Home" points at the page's own top (hero) section — the only
          // page hierarchy this pipeline knows about is its own section
          // navigation, not a real multi-page URL structure.
          value: [
            { label: 'Home', targetComponentId: `section-${breadcrumbSectionIds[0]}` },
            ...breadcrumbSectionIds.map((sectionId) => ({
              label: titleCase(sectionId),
              targetComponentId: `section-${sectionId}`,
            })),
          ],
          source: 'LayoutConfiguration.pageStructure',
        },
      },
    });
  }

  if (faqItems && faqItems.length > 0) {
    bindings.push({
      type: 'FAQPage',
      data: {
        items: { value: faqItems, source: 'ComponentManifest FAQ binding' },
      },
    });
  }

  return bindings;
}
