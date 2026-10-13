import { describe, expect, it } from 'vitest';
import type { BusinessContactInfo } from '@riznexia/shared-types';
import { fakeBrandBrief, fakeThemeConfiguration } from '../layout/layout-fixtures';
import {
  BRIEF_ENGINE_VERSION,
  extractOpeningHours,
  generateBrief,
  slugify,
  whatsappLink,
} from './brief-generator';
import { DESIGN_DIRECTIONS } from './design-directions';

function fakeBusiness(overrides: Partial<BusinessContactInfo> = {}): BusinessContactInfo {
  return {
    businessName: "Joe's Diner",
    address: '123 Main St',
    city: 'Karachi',
    phone: '0300 1234567',
    photos: [{ photoReference: 'photo-ref-1' }],
    openingHours: { weekdayText: ['Monday: 9:00 AM – 11:00 PM', 'Tuesday: 9:00 AM – 11:00 PM'] },
    rating: 4.5,
    reviewCount: 120,
    googleBusinessUrl: 'https://maps.google.com/?cid=12345',
    latitude: 24.8607,
    longitude: 67.0011,
    ...overrides,
  };
}

function build(business = fakeBusiness()) {
  return generateBrief({
    brandBrief: fakeBrandBrief(),
    business,
    themeConfiguration: fakeThemeConfiguration(),
  });
}

describe('generateBrief', () => {
  it('is deterministic: same input, same markdown', () => {
    expect(build().markdown).toBe(build().markdown);
  });

  it('puts the real business data in the identity table', () => {
    const { markdown } = build();
    expect(markdown).toContain("# BRIEF — Joe's Diner");
    expect(markdown).toContain('123 Main St');
    expect(markdown).toContain('4.5 / 5 (120 reviews)');
    expect(markdown).toContain('https://wa.me/923001234567');
    expect(markdown).toContain('tel:03001234567');
    expect(markdown).toContain('Monday: 9:00 AM – 11:00 PM');
  });

  it('carries the brand tokens verbatim', () => {
    const { markdown } = build();
    expect(markdown).toContain('`#8B4513`');
    expect(markdown).toContain('Pacifico');
  });

  it('embeds the theme-specific design direction', () => {
    const { markdown } = build();
    expect(markdown).toContain('Category rail');
    expect(markdown).toContain('Floating WhatsApp button');
  });

  it('writes one numbered spec per theme section, in order', () => {
    const { markdown } = build();
    const order = fakeThemeConfiguration().sectionOrder;
    order.forEach((id, i) => expect(markdown).toContain(`### 6.${i + 1} `));
    expect(markdown.indexOf('(`hero`)')).toBeGreaterThan(-1);
    expect(markdown.indexOf('(`footer`)')).toBeGreaterThan(markdown.indexOf('(`contact`)'));
  });

  it('records data gaps instead of inventing missing facts', () => {
    const brief = build(
      fakeBusiness({
        phone: null,
        openingHours: null,
        photos: null,
        rating: null,
        reviewCount: null,
      }),
    );
    expect(brief.dataGaps.length).toBeGreaterThan(4);
    expect(brief.markdown).toContain('Phone number is missing');
    expect(brief.markdown).toContain('Opening hours are missing');
    expect(brief.markdown).toContain('no Google photos');
    expect(brief.markdown).not.toContain('https://wa.me/');
  });

  it('returns a safe folder slug and file path', () => {
    const brief = build();
    expect(brief.slug).toBe('joes-diner-karachi');
    expect(brief.filePath).toBe('briefs/joes-diner-karachi/BRIEF.md');
  });

  it('mentions the engine version and has the acceptance checklist', () => {
    const { markdown } = build();
    expect(markdown).toContain(BRIEF_ENGINE_VERSION);
    expect(markdown).toContain('## 11. Acceptance checklist');
  });

  it('falls back to a generic guide for an unknown section id', () => {
    const brief = generateBrief({
      brandBrief: fakeBrandBrief(),
      business: fakeBusiness(),
      themeConfiguration: fakeThemeConfiguration({
        sectionOrder: ['hero', 'special-offers', 'footer'],
        sectionComponentMap: {},
      }),
    });
    expect(brief.markdown).toContain('Special Offers');
  });
});

describe('design directions', () => {
  it('exist for every theme category with real content', () => {
    for (const [id, d] of Object.entries(DESIGN_DIRECTIONS)) {
      expect(d.id).toBe(id);
      expect(d.concept.length).toBeGreaterThan(80);
      expect(d.signatureSections.length).toBeGreaterThan(3);
      expect(d.imageQueries.length).toBeGreaterThan(3);
    }
  });
});

describe('helpers', () => {
  it('slugify handles apostrophes, ampersands and accents', () => {
    expect(slugify("Joe's Café & Grill")).toBe('joes-cafe-and-grill');
  });

  it('whatsappLink normalises local, international and bad numbers', () => {
    expect(whatsappLink('0300-1234567')).toBe('https://wa.me/923001234567');
    expect(whatsappLink('+92 300 1234567')).toBe('https://wa.me/923001234567');
    expect(whatsappLink('0092 300 1234567')).toBe('https://wa.me/923001234567');
    expect(whatsappLink('(021) 3889 9998')).toBe('https://wa.me/92213889999' + '8');
    expect(whatsappLink('12')).toBeNull();
    expect(whatsappLink(null)).toBeNull();
  });

  it('extractOpeningHours reads camel and snake case, otherwise empty', () => {
    expect(extractOpeningHours({ weekday_text: ['Mon: 9-5'] })).toEqual(['Mon: 9-5']);
    expect(extractOpeningHours({ weekdayText: ['Mon: 9-5'] })).toEqual(['Mon: 9-5']);
    expect(extractOpeningHours(null)).toEqual([]);
    expect(extractOpeningHours({ foo: 1 })).toEqual([]);
  });
});
