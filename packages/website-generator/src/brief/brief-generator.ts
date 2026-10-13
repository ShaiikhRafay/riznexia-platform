import type {
  BusinessAnalysisOutput,
  BusinessContactInfo,
  ThemeConfiguration,
} from '@riznexia/shared-types';
import { stockPhotoForTheme } from '../content/stock-photos';
import { designDirectionFor } from './design-directions';

// Versions this module's template/rules — distinct from the engine versions
// of its three inputs (analysis prompt, theme, ...).
export const BRIEF_ENGINE_VERSION = 'v1.0';

export interface BriefInput {
  brandBrief: BusinessAnalysisOutput;
  business: BusinessContactInfo;
  themeConfiguration: ThemeConfiguration;
  /** ISO timestamp shown in the header. Passed in (never Date.now()) so the output stays deterministic. */
  generatedAt?: string;
  /** Used to turn a local phone number (0300...) into a wa.me link. Defaults to Pakistan. */
  defaultCountryCallingCode?: string;
}

export interface GeneratedBrief {
  /** The full BRIEF.md text. */
  markdown: string;
  /** URL/folder-safe business slug, e.g. "joes-diner-karachi". */
  slug: string;
  /** Suggested file path relative to the repo root: briefs/<slug>/BRIEF.md */
  filePath: string;
  /** Fields the brief could not fill from real data — Claude Code must not invent these. */
  dataGaps: string[];
}

interface SectionGuide {
  title: string;
  purpose: string;
  build: string;
}

// Section ids come from the M7 themes' sectionOrder. Anything not listed
// falls back to a generic guide, so a new theme never breaks the brief.
const SECTION_GUIDES: Record<string, SectionGuide> = {
  hero: {
    title: 'Hero',
    purpose: 'Win the first three seconds: what this is, why it is good, one clear action.',
    build:
      "Follow the Hero rules in the Design Direction. Headline from the brief's USPs (max 8 words), supporting line (max 20 words), primary CTA plus phone/WhatsApp secondary. Trust chip with the real Google rating and review count when available.",
  },
  about: {
    title: 'About',
    purpose: 'Make the business feel real and likeable.',
    build:
      'Short story (80-120 words) from the business summary and USPs, two or three proof points, one photo. Never invent founding years, awards or staff names.',
  },
  menu: {
    title: 'Menu / Popular items',
    purpose: 'Show what people can order and make it easy to choose.',
    build:
      'Category rail plus photo cards as described in the Design Direction. Real services/dishes come from "Services" below; extra items must be sample items marked as sample, with prices shown as "Sample price" or omitted.',
  },
  services: {
    title: 'Services',
    purpose: 'Explain what is offered in plain language.',
    build:
      'One card per primary service (icon, title, one-line benefit). Secondary services in a compact list.',
  },
  gallery: {
    title: 'Gallery',
    purpose: 'Build desire and credibility with real-looking imagery.',
    build:
      "8-12 images in a masonry or mosaic grid with lightbox. Use the business's own Google photos first; fill the rest with placeholders and label them in the code comments.",
  },
  testimonials: {
    title: 'Testimonials',
    purpose: 'Social proof.',
    build:
      'Show the real Google rating and review count. Quotes must be clearly sample/placeholder unless real review text was supplied.',
  },
  'reservation-cta': {
    title: 'Reservation / booking CTA',
    purpose: 'Convert interest into action.',
    build: 'Full-width contrast band: one sentence, primary button, phone button.',
  },
  contact: {
    title: 'Contact',
    purpose: 'Remove every barrier to getting in touch.',
    build:
      'Address, hours table (today highlighted), tap-to-call, WhatsApp button, map embed (or static map link), contact form with mailto/WhatsApp fallback.',
  },
  footer: {
    title: 'Footer',
    purpose: 'Navigation, trust and legal basics.',
    build:
      'Logo, short blurb, quick links, contact block, hours, social links if provided, copyright with the current year, and a small "Demo website prepared by Riznexia" credit.',
  },
  team: {
    title: 'Team',
    purpose: 'Put faces to the business.',
    build:
      'Portrait cards with role and specialty. Only names/qualifications supplied in the data; otherwise generic roles and placeholder portraits.',
  },
  pricing: {
    title: 'Pricing / Plans',
    purpose: 'Make cost clear.',
    build: 'Three plans max, one highlighted. Mark all figures as sample if not supplied.',
  },
  faq: {
    title: 'FAQ',
    purpose: 'Answer objections.',
    build:
      'Accordion of 5-6 questions relevant to the industry; answers must not make claims the data does not support.',
  },
};

function titleCase(id: string): string {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function guideFor(sectionId: string): SectionGuide {
  return (
    SECTION_GUIDES[sectionId] ?? {
      title: titleCase(sectionId),
      purpose: 'Support the page goal with this section.',
      build:
        'Design this section to match the Design Direction. Use real data where it exists; label anything else as sample.',
    }
  );
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function whatsappLink(
  phone: string | null,
  defaultCountryCallingCode = '92',
): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = defaultCountryCallingCode + digits.slice(1);
  }
  digits = digits.replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

function telLink(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
}

// Google Places "weekdayText" (camel or snake case) -> plain lines. Anything
// else -> empty, which becomes a recorded data gap instead of a guess.
export function extractOpeningHours(openingHours: unknown): string[] {
  if (!openingHours || typeof openingHours !== 'object') return [];
  const record = openingHours as Record<string, unknown>;
  const raw = record.weekdayText ?? record.weekday_text;
  if (!Array.isArray(raw)) return [];
  return raw.filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function bullets(items: readonly string[], empty = '_none provided_'): string {
  return items.length > 0 ? items.map((i) => `- ${i}`).join('\n') : empty;
}

function mapsUrl(business: BusinessContactInfo): string | null {
  if (business.googleBusinessUrl) return business.googleBusinessUrl;
  if (business.latitude !== null && business.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`;
  }
  return null;
}

/**
 * Pure and deterministic: the same input always yields the same BRIEF.md
 * text. No AI call, no I/O, no Date.now()/Math.random(). The brief is the
 * single hand-off document between the Riznexia platform (discovery,
 * analysis, theme selection) and the site build (Claude Code), so it states
 * its own gaps instead of letting the builder guess.
 */
export function generateBrief(input: BriefInput): GeneratedBrief {
  const { brandBrief, business, themeConfiguration: theme } = input;
  const direction = designDirectionFor(theme.themeId);
  const slug = slugify(`${business.businessName} ${business.city}`) || 'business';
  const hours = extractOpeningHours(business.openingHours);
  const wa = whatsappLink(business.phone, input.defaultCountryCallingCode ?? '92');
  const tel = telLink(business.phone);
  const maps = mapsUrl(business);
  const stockPhoto = stockPhotoForTheme(theme.themeName);
  const photoCount = business.photos?.length ?? 0;

  const dataGaps: string[] = [];
  if (!business.phone)
    dataGaps.push(
      'Phone number is missing: omit tap-to-call and WhatsApp buttons, do not invent a number.',
    );
  if (hours.length === 0)
    dataGaps.push(
      'Opening hours are missing: show "Contact us for opening hours", do not invent hours.',
    );
  if (photoCount === 0)
    dataGaps.push(
      'The business has no Google photos: use clearly labelled placeholder photography everywhere.',
    );
  if (business.rating === null) dataGaps.push('No Google rating: omit rating badges.');
  if (!maps) dataGaps.push('No map location: omit the map embed and show the address only.');
  if (!business.googleBusinessUrl)
    dataGaps.push('No Google Business Profile link: omit "View on Google" links.');
  dataGaps.push(
    'No email address is held by the platform: use a contact form with a WhatsApp/phone fallback.',
  );
  dataGaps.push(
    'No real menu/price list is held by the platform: any items or prices beyond the listed services are SAMPLE content and must be labelled as such.',
  );

  const lines: string[] = [];
  const push = (...ls: string[]) => lines.push(...ls);

  push(
    `# BRIEF — ${business.businessName}`,
    '',
    `> Generated by the Riznexia AI Sales Platform · brief engine ${BRIEF_ENGINE_VERSION} · theme "${theme.themeName}" ${theme.themeVersion}${input.generatedAt ? ` · ${input.generatedAt}` : ''}`,
    '',
    '## 0. How to use this brief',
    '',
    'You are building a **production-quality, eye-catching demo website** for the business below. This file is the single source of truth.',
    '',
    '1. Read `CLAUDE.md` (next to this file) first: it holds the stack, quality bar and build/verify commands.',
    '2. Create the site in the `./site` folder (a standalone Next.js 15 + Tailwind + Framer Motion project with `package.json` at `./site/package.json`). Build it from scratch; there is no starter repo. Use only text files: remote image URLs (Unsplash/Pexels) and SVG, never binary assets.',
    '3. Follow sections 3-8 exactly. Section 5 (Design Direction) is what makes the site look designed: do not water it down into a generic template.',
    '4. Never invent facts. Section 10 lists what is missing; anything not in this brief is either omitted or clearly labelled as sample content.',
    '5. Finish by running the acceptance checklist in section 11 and fixing every failure.',
    '',
    '## 1. Business identity',
    '',
    '| Field | Value |',
    '|---|---|',
    `| Name | ${cell(business.businessName)} |`,
    `| Industry | ${cell(brandBrief.industry)} |`,
    `| City | ${cell(business.city)} |`,
    `| Address | ${cell(business.address)} |`,
    `| Phone | ${business.phone ? cell(business.phone) : '_missing_'} |`,
    `| Tap-to-call | ${tel ?? '_n/a_'} |`,
    `| WhatsApp | ${wa ?? '_n/a_'} |`,
    `| Google rating | ${business.rating !== null ? `${business.rating} / 5 (${business.reviewCount ?? 0} reviews)` : '_missing_'} |`,
    `| Google profile | ${business.googleBusinessUrl ?? '_missing_'} |`,
    `| Map | ${maps ?? '_missing_'} |`,
    `| Coordinates | ${business.latitude !== null && business.longitude !== null ? `${business.latitude}, ${business.longitude}` : '_missing_'} |`,
    `| Real photos available | ${photoCount} |`,
    '',
    '### Opening hours',
    '',
    hours.length > 0 ? bullets(hours) : '_missing — see data gaps_',
    '',
    '## 2. Positioning and voice',
    '',
    `**Summary:** ${brandBrief.businessSummary}`,
    '',
    `**Tone of voice:** ${brandBrief.toneOfVoice}`,
    '',
    '**Brand personality**',
    bullets(brandBrief.brandPersonality),
    '',
    '**Target audience**',
    bullets(brandBrief.targetAudience),
    '',
    '**Unique selling points** (use these for headlines; do not add others)',
    bullets(brandBrief.uniqueSellingPoints),
    '',
    '**Trust signals**',
    bullets(brandBrief.trustSignals),
    '',
    '**Social proof ideas**',
    bullets(brandBrief.socialProofSuggestions),
    '',
    '## 3. Services / offering',
    '',
    '**Primary**',
    bullets(brandBrief.primaryServices),
    '',
    '**Secondary**',
    bullets(brandBrief.secondaryServices),
    '',
    '**Content recommendations from the analysis**',
    bullets(brandBrief.contentRecommendations),
    '',
    '## 4. Brand tokens',
    '',
    'Brand identity wins over theme defaults: use these colours and fonts as given.',
    '',
    '| Token | Value |',
    '|---|---|',
    `| primary | \`${brandBrief.colorPalette.primary}\` |`,
    `| secondary | \`${brandBrief.colorPalette.secondary}\` |`,
    `| accent | \`${brandBrief.colorPalette.accent}\` |`,
    `| background | \`${brandBrief.colorPalette.background}\` |`,
    `| text | \`${brandBrief.colorPalette.text}\` |`,
    `| heading font | ${cell(brandBrief.typography.heading)} |`,
    `| body font | ${cell(brandBrief.typography.body)} |`,
    `| accent / script font | ${cell(brandBrief.typography.accent)} |`,
    '',
    'Rules:',
    '- Load fonts with `next/font/google` when they exist on Google Fonts; otherwise choose the closest Google font and note it in a code comment.',
    '- Derive extra shades (tints, a deep "band" tone, hover states) from the five colours with `color-mix()`; do not add unrelated hues.',
    `- Contrast target: WCAG ${theme.accessibilityProfile.contrastLevel} for all text. Fix any failing pair by darkening/lightening, not by changing the brand colour itself.`,
    `- Minimum tap target ${theme.accessibilityProfile.minTouchTargetPx}px (${theme.mobilePreferences.tapTargetSizePx}px on mobile).`,
    '',
    `## 5. Design direction — ${direction.label}`,
    '',
    `**Concept:** ${direction.concept}`,
    '',
    '**Theme settings chosen by the Theme Engine**',
    '',
    '| Setting | Value |',
    '|---|---|',
    `| Layout style | ${cell(theme.layoutStyle)} |`,
    `| Navigation | ${theme.navigationStyle} (mobile: ${theme.mobilePreferences.navigationPattern}) |`,
    `| Hero style | ${theme.heroStyle} |`,
    `| CTA style | ${theme.ctaStyle} |`,
    `| Card style | ${theme.cardStyle} |`,
    `| Footer style | ${theme.footerStyle} |`,
    `| Animation level | ${theme.animationLevel} |`,
    `| Image style | ${theme.imageStyle} |`,
    '',
    '### Header',
    bullets(direction.header),
    '',
    '### Hero',
    bullets(direction.hero),
    '',
    '### Signature sections',
    '',
    ...direction.signatureSections.flatMap((s) => [`**${s.name}.** ${s.spec}`, '']),
    '### Motion',
    bullets(direction.motion),
    '',
    '### Imagery art direction',
    bullets(direction.imagery),
    '',
    '### Conversion mechanics',
    bullets(direction.conversion),
    '',
    '### Mobile',
    bullets(direction.mobile),
    '',
    '### Avoid',
    bullets(direction.avoid),
    '',
    '## 6. Sitemap and section-by-section spec',
    '',
    'Single-page site with anchor navigation unless a section clearly deserves its own page. Sections in order:',
    '',
  );

  theme.sectionOrder.forEach((sectionId, index) => {
    const guide = guideFor(sectionId);
    const components = theme.sectionComponentMap[sectionId] ?? [];
    push(
      `### 6.${index + 1} ${guide.title} (\`${sectionId}\`)`,
      '',
      `- **Purpose:** ${guide.purpose}`,
      `- **Build:** ${guide.build}`,
      ...(components.length > 0
        ? [`- **Theme components:** ${components.join(', ')} (treat as a hint, not a limit)`]
        : []),
      '',
    );
  });

  push(
    '**Analysis-suggested sections** (cross-check: include any that are missing above and make sense)',
    bullets(brandBrief.websiteSections),
    '',
    '## 7. Calls to action',
    '',
    brandBrief.ctaRecommendations.length > 0
      ? brandBrief.ctaRecommendations
          .map(
            (c, i) =>
              `${i + 1}. **${c}** — ${i === 0 ? 'primary: hero, after the main content section, and footer' : i === 1 ? 'secondary: mid-page band and sticky mobile bar' : 'tertiary: footer and contact section'}`,
          )
          .join('\n')
      : '_none provided_',
    '',
    `Always-on contact: ${tel ? `tap-to-call (${tel})` : 'no phone available'}${wa ? `, floating WhatsApp (${wa}?text=Hi%2C%20I%20found%20your%20website)` : ''}.`,
    '',
    '## 8. Imagery plan',
    '',
    `- Real Google photos available: **${photoCount}**. If a photo reference exists use it; Google photo URLs require an API key, so when none is configured fall back to placeholders.`,
    stockPhoto
      ? `- Verified placeholder for this theme: ${stockPhoto} (Unsplash licence). Use as the hero fallback.`
      : '- No verified theme placeholder exists: use gradient + pattern fallbacks, never a broken image.',
    "- Placeholder rule: every non-business photo must be a freely licensed image (Unsplash/Pexels), stored in `public/images/placeholders/`, with a code comment `// PLACEHOLDER` and a descriptive `alt`. Never imply a stock photo is the business's own.",
    '- Use `next/image` with explicit sizes, `priority` on the hero only, and a blurred/solid colour placeholder to avoid layout shift.',
    '',
    '**Suggested search queries for placeholders**',
    bullets(direction.imageQueries),
    '',
    '**Image recommendations from the analysis**',
    bullets(brandBrief.imageRecommendations),
    '',
    '## 9. SEO and structured data',
    '',
    '**Keywords**',
    bullets(brandBrief.seoKeywords),
    '',
    '**Local SEO**',
    bullets(brandBrief.localSeoSuggestions),
    '',
    `- Title pattern: \`${business.businessName} | ${brandBrief.industry} in ${business.city}\` (max 60 chars).`,
    `- Meta description: one sentence from the summary plus the city and primary CTA (max 155 chars).`,
    '- One `h1`, logical `h2`/`h3`, descriptive `alt`, `lang="en"`, canonical, Open Graph and Twitter tags, `robots.txt`, `sitemap.xml`.',
    '- JSON-LD `LocalBusiness` (or the closest subtype such as `Restaurant`/`Dentist`) using only the real fields from section 1; add `FAQPage` if an FAQ is built.',
    '',
    '## 10. Data gaps and content policy',
    '',
    '**Never invent**: phone numbers, addresses, opening hours, awards, years in business, staff names, certifications, customer counts, review text presented as real.',
    '',
    '**Known gaps for this business**',
    bullets(dataGaps),
    '',
    '**Sample content** is allowed only for things like menu items, prices, testimonials and gallery images, and must be (a) plausible for the industry, (b) marked `SAMPLE` in code comments, and (c) easy to replace via a single `data/site.ts` file.',
    '',
    '## 11. Acceptance checklist',
    '',
    'Do not report the site as finished until all pass:',
    '',
    '- [ ] `pnpm build` (or `npm run build`) succeeds with no type or lint errors.',
    '- [ ] Screenshots taken at 390px, 768px and 1440px widths; no horizontal scroll, no overlapping elements, nothing cut off.',
    '- [ ] First screen shows: business name, what it is, the primary CTA and a phone/WhatsApp action, without scrolling on mobile.',
    '- [ ] Hero, signature sections and motion match section 5; it does not look like a generic template.',
    '- [ ] Lighthouse (mobile): Performance >= 90, Accessibility >= 95, Best Practices >= 95, SEO >= 95.',
    `- [ ] Text contrast meets WCAG ${theme.accessibilityProfile.contrastLevel}; focus rings visible; all images have alt text; \`prefers-reduced-motion\` respected.`,
    '- [ ] All phone/WhatsApp/map links work and use the exact values in section 1.',
    '- [ ] Every sample or placeholder item is labelled in code and replaceable from one data file.',
    '- [ ] A `README.md` in the site folder explains how to run, edit content and deploy to Vercel.',
    '',
  );

  return {
    markdown: lines.join('\n'),
    slug,
    filePath: `briefs/${slug}/BRIEF.md`,
    dataGaps,
  };
}
