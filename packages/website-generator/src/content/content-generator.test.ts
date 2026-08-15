import { describe, expect, it } from 'vitest';
import { generateContentManifest, CONTENT_ENGINE_VERSION } from './content-generator';
import {
  fakeBrandBrief,
  fakeBusinessContactInfo,
  fakeComponentManifest,
  fakeLayoutConfiguration,
  fakeThemeConfiguration,
} from './content-fixtures';

describe('generateContentManifest', () => {
  it('is deterministic — identical input produces byte-identical output, repeatedly', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);

    const first = generateContentManifest(brandBrief, business, theme, layout, manifest);
    const second = generateContentManifest(brandBrief, business, theme, layout, manifest);

    expect(second).toEqual(first);
  });

  it('stamps the current content engine version', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const result = generateContentManifest(
      brandBrief,
      business,
      theme,
      layout,
      fakeComponentManifest(brandBrief, theme, layout),
    );
    expect(result.contentEngineVersion).toBe(CONTENT_ENGINE_VERSION);
  });

  it('binds navigation links from LayoutConfiguration.navigation.items, each with a real target', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const nav = result.componentContent.find((c) => c.componentId === 'navigation');
    const links = nav?.fields.find((f) => f.slotName === 'links');
    expect(links?.value.source).toBe('LayoutConfiguration.navigation.items');
    expect(links?.value.value).toEqual(
      layout.navigation.items.map((sectionId) => ({
        label: expect.any(String),
        targetComponentId: `section-${sectionId}`,
      })),
    );
  });

  it('binds hero headline/subheadline/backgroundImage/primaryCta with correct sources', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const hero = result.componentContent.find((c) => c.componentId === 'hero-banner');
    expect(hero?.fields.find((f) => f.slotName === 'headline')?.value).toEqual({
      value: brandBrief.uniqueSellingPoints[0],
      source: 'BusinessAnalysis.brandBrief.uniqueSellingPoints[0]',
    });
    expect(hero?.fields.find((f) => f.slotName === 'subheadline')?.value).toEqual({
      value: brandBrief.businessSummary,
      source: 'BusinessAnalysis.brandBrief.businessSummary',
    });
    expect(hero?.fields.find((f) => f.slotName === 'backgroundImage')?.value).toEqual({
      value: { photoReference: 'photo-ref-1' },
      source: 'Business.photos[0]',
    });
    expect(hero?.fields.find((f) => f.slotName === 'primaryCta')?.value).toEqual({
      value: { label: brandBrief.ctaRecommendations[0], targetComponentId: 'section-contact' },
      source: 'BusinessAnalysis.brandBrief.ctaRecommendations[0]',
    });
  });

  it('binds card-grid/menu-list items from primaryServices+secondaryServices', () => {
    const brandBrief = fakeBrandBrief({
      primaryServices: ['Dine-in'],
      secondaryServices: ['Catering'],
    });
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const menu = result.componentContent.find((c) => c.componentId === 'menu-showcase');
    const gallery = result.componentContent.find((c) => c.componentId === 'gallery-grid');
    expect(menu?.fields.find((f) => f.slotName === 'items')?.value).toEqual({
      value: ['Dine-in', 'Catering'],
      source: 'BusinessAnalysis.brandBrief.primaryServices+secondaryServices',
    });
    expect(gallery?.fields.find((f) => f.slotName === 'items')?.value.value).toEqual([
      'Dine-in',
      'Catering',
    ]);
    expect(menu?.fields.find((f) => f.slotName === 'sectionTitle')?.value).toEqual({
      value: 'Menu',
      source: 'LayoutConfiguration.pageStructure[].sectionId',
    });
  });

  it('binds gallery-grid images from real Business.photos, never the menu-showcase card-grid', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo({
      photos: [{ photoReference: 'photo-ref-1' }, { photoReference: 'photo-ref-2' }],
    });
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const gallery = result.componentContent.find((c) => c.componentId === 'gallery-grid');
    expect(gallery?.fields.find((f) => f.slotName === 'images')?.value).toEqual({
      value: [{ photoReference: 'photo-ref-1' }, { photoReference: 'photo-ref-2' }],
      source: 'Business.photos',
    });

    const menu = result.componentContent.find((c) => c.componentId === 'menu-showcase');
    expect(menu?.fields.some((f) => f.slotName === 'images')).toBe(false);
  });

  it('leaves gallery-grid images unresolved (not fabricated) when the business has no real photos', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo({ photos: [] });
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const gallery = result.componentContent.find((c) => c.componentId === 'gallery-grid');
    expect(gallery?.fields.some((f) => f.slotName === 'images')).toBe(false);
    expect(
      result.unresolvedBindings.some(
        (u) => u.componentId === 'gallery-grid' && u.slotName === 'images',
      ),
    ).toBe(true);
    // items (text fallback) still resolves normally either way.
    expect(gallery?.fields.some((f) => f.slotName === 'items')).toBe(true);
  });

  it('binds testimonial-carousel items from socialProofSuggestions (founder-approved fork)', () => {
    const brandBrief = fakeBrandBrief({
      socialProofSuggestions: ['200+ five-star reviews', 'Voted best in the city'],
    });
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const carousel = result.componentContent.find((c) => c.componentId === 'testimonial-carousel');
    expect(carousel?.fields.find((f) => f.slotName === 'items')?.value).toEqual({
      value: ['200+ five-star reviews', 'Voted best in the city'],
      source: 'BusinessAnalysis.brandBrief.socialProofSuggestions',
    });
  });

  it('records an optional slot as unresolved (not fabricated) when its source is empty', () => {
    const brandBrief = fakeBrandBrief({ trustSignals: [] });
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const unresolved = result.unresolvedBindings.find(
      (u) => u.componentId === 'reservation-cta' && u.slotName === 'supportingText',
    );
    expect(unresolved).toEqual({
      componentId: 'reservation-cta',
      slotName: 'supportingText',
      required: false,
      reason: 'no-source-available',
    });
  });

  it('records a required slot with genuinely no source as unresolved, never fabricated', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo();
    // Insert a 'faq' section carrying an accordion component — no theme
    // ships this by default in the shared fixture, so this exercises the
    // "required, no source anywhere" path directly.
    const theme = fakeThemeConfiguration({
      sectionOrder: [
        'hero',
        'about',
        'menu',
        'gallery',
        'testimonials',
        'reservation-cta',
        'faq',
        'contact',
        'footer',
      ],
      componentSet: [
        'hero-banner',
        'menu-showcase',
        'gallery-grid',
        'testimonial-carousel',
        'reservation-cta',
        'map-embed',
        'faq-accordion',
      ],
      sectionComponentMap: {
        hero: ['hero-banner'],
        about: [],
        menu: ['menu-showcase'],
        gallery: ['gallery-grid'],
        testimonials: ['testimonial-carousel'],
        'reservation-cta': ['reservation-cta'],
        faq: ['faq-accordion'],
        contact: ['map-embed'],
        footer: [],
      },
    });
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const faqUnresolved = result.unresolvedBindings.find(
      (u) => u.componentId === 'faq-accordion' && u.slotName === 'items',
    );
    expect(faqUnresolved).toEqual({
      componentId: 'faq-accordion',
      slotName: 'items',
      required: true,
      reason: 'no-source-available',
    });
    expect(
      result.componentContent.some(
        (c) => c.componentId === 'faq-accordion' && c.fields.some((f) => f.slotName === 'items'),
      ),
    ).toBe(false);
    // FAQPage stays absent — "when applicable" — since no real FAQ content exists.
    expect(result.structuredData.some((entry) => entry.type === 'FAQPage')).toBe(false);
  });

  it('binds SEO metadata — keywords/localSeoSuggestions verbatim, metaTitle templated, metaDescription verbatim', () => {
    const brandBrief = fakeBrandBrief({
      seoKeywords: ['diner near me'],
      industry: 'Italian Restaurant',
    });
    const business = fakeBusinessContactInfo({ businessName: "Joe's Diner", city: 'Karachi' });
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    expect(result.seoMetadata.keywords).toEqual({
      value: ['diner near me'],
      source: 'BusinessAnalysis.brandBrief.seoKeywords',
    });
    expect(result.seoMetadata.metaTitle).toEqual({
      value: "Joe's Diner | Italian Restaurant in Karachi",
      source: 'Business.businessName+BusinessAnalysis.brandBrief.industry+Business.city',
    });
    expect(result.seoMetadata.metaDescription).toEqual({
      value: brandBrief.businessSummary,
      source: 'BusinessAnalysis.brandBrief.businessSummary',
    });
  });

  it('binds LocalBusiness/Organization/BreadcrumbList structured data from real Business/Layout fields', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const localBusiness = result.structuredData.find((entry) => entry.type === 'LocalBusiness');
    expect(localBusiness?.data.name).toEqual({
      value: business.businessName,
      source: 'Business.businessName',
    });
    expect(localBusiness?.data.telephone).toEqual({
      value: business.phone,
      source: 'Business.phone',
    });

    const organization = result.structuredData.find((entry) => entry.type === 'Organization');
    expect(organization?.data.name).toEqual({
      value: business.businessName,
      source: 'Business.businessName',
    });

    const breadcrumb = result.structuredData.find((entry) => entry.type === 'BreadcrumbList');
    expect(Array.isArray(breadcrumb?.data.itemListElement?.value)).toBe(true);
    expect((breadcrumb?.data.itemListElement?.value as unknown[])[0]).toMatchObject({
      label: 'Home',
    });
  });

  it('resolves CTA targets to the "contact" section when it exists', () => {
    const brandBrief = fakeBrandBrief();
    const business = fakeBusinessContactInfo();
    const theme = fakeThemeConfiguration();
    const layout = fakeLayoutConfiguration(brandBrief, theme);
    const manifest = fakeComponentManifest(brandBrief, theme, layout);
    const result = generateContentManifest(brandBrief, business, theme, layout, manifest);

    const cta = result.componentContent.find((c) => c.componentId === 'reservation-cta');
    const ctaLink = cta?.fields.find((f) => f.slotName === 'ctaLink');
    expect((ctaLink?.value.value as { targetComponentId?: string }).targetComponentId).toBe(
      'section-contact',
    );
  });
});
