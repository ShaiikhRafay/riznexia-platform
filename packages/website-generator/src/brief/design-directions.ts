import type { ThemeCategory } from '@riznexia/shared-types';

// Rich, hand-authored art direction per theme category — the "Design
// Direction" block that generateBrief() embeds in every BRIEF.md. The M7
// theme definitions only carry ~25 enum settings (heroStyle, cardStyle, ...);
// that is enough to pick a layout skeleton but not enough to make a site
// feel designed. This file is the creative layer on top: concrete patterns,
// motion rules, imagery art direction and conversion mechanics that Claude
// Code follows when it builds the site.
//
// Authored data, not generated — same discipline as the M7 theme
// definitions. Patterns are described generically ("pill header chips",
// "split promo hero"); they are inspired by well-converting local-business
// sites but never reproduce another brand's logo, copy, photos or artwork.

export interface SignatureSection {
  name: string;
  spec: string;
}

export interface DesignDirection {
  id: ThemeCategory;
  label: string;
  /** One paragraph: the feeling the page must create within 3 seconds. */
  concept: string;
  header: string[];
  hero: string[];
  signatureSections: SignatureSection[];
  motion: string[];
  imagery: string[];
  /** Suggested stock-photo search queries (Unsplash) for placeholder slots. */
  imageQueries: string[];
  conversion: string[];
  mobile: string[];
  avoid: string[];
}

const RESTAURANT: DesignDirection = {
  id: 'restaurant',
  label: 'Restaurant / Café / Food business',
  concept:
    'Appetite first. The visitor should be hungry and holding the phone within three seconds: big, warm, saturated food photography, a loud promo moment, prices visible, and one-tap ordering or reservation always in reach. Feels like a modern delivery-app storefront crossed with a boutique dining room.',
  header: [
    'Slim announcement bar above the header (offer, "prices exclusive of tax", free-delivery threshold) in the deep brand tone with light text.',
    'Header uses soft pill/rounded chips on a light surface: location or pickup chip, tappable phone chip, centered round logo badge that slightly overlaps the hero edge, then "Reserve a table" chip, cart/order icon and a hamburger.',
    'Sticky on scroll but collapses to a compact bar (logo + phone + order button).',
  ],
  hero: [
    'Large rounded-corner carousel card (radius-xl), 2-4 slides, autoplay 6s, pause on hover, dot indicators and arrow buttons.',
    'Slide layout is split: left panel in a warm tint of the brand colour with a huge numeric/offer headline (e.g. "30% OFF" at display size), a script accent word in the accent font, a pill button; right panel is a full-bleed food photo cropped tight.',
    'One slide should be a pure "signature dish" photo with a short headline; one slide a reservation/event promo.',
    'Never a flat colour fallback: if there is no photo, use a brand gradient plus a botanical/pattern illustration.',
  ],
  signatureSections: [
    {
      name: 'Category rail',
      spec: 'Horizontally scrollable dark band under the hero: icon + label tiles (Deals, Starters, Burgers, Mains, Desserts, Drinks ...). Active tile becomes a rounded blush/accent pill. Sticks under the header while the menu is in view. Doubles as anchor navigation to menu groups.',
    },
    {
      name: 'Popular items',
      spec: 'Heading with a small flame icon and "Most ordered right now". 4-up grid (2-up on mobile) of rounded photo cards: big dish photo, UPPERCASE dish name, struck-through old price next to the real price in a bold pill, round "+" add button bottom-right of the photo. Hover lifts the card and zooms the photo 1.05x.',
    },
    {
      name: 'Deals',
      spec: 'Banner with brand-colour background and tasteful leaf/pattern illustration, then 2-column deal cards: "DEAL 01" label, what is included, price, photo on the right with a "+" button.',
    },
    {
      name: 'Venue / spaces (if the business has multiple floors, rooms or a view)',
      spec: 'Numbered carousel or tabbed gallery of each space with a short description, capacity and one photo each. Use a large-type number per space.',
    },
    {
      name: 'Reviews strip',
      spec: 'Google rating badge, review count, three rotating testimonial cards with initials avatars. Only real rating/review count from the data; sample quotes must be labelled as sample.',
    },
    {
      name: 'Reservation / order CTA band',
      spec: 'Full-width contrasting band with one short sentence, a primary button (Reserve / Order Now) and a phone button.',
    },
    {
      name: 'Find us',
      spec: 'Map embed beside address, hours table (today highlighted), phone, WhatsApp, "Get directions" button.',
    },
  ],
  motion: [
    'Hero text staggers in (opacity + 16px rise, 80ms steps).',
    'Section headings and cards reveal on scroll once (IntersectionObserver or Framer Motion whileInView).',
    'Photo cards: hover zoom 1.05 + shadow lift; "+" button springs on press.',
    'Marquee of offers or dish names between sections is welcome (slow, pausable).',
    'Respect prefers-reduced-motion.',
  ],
  imagery: [
    'Warm, high-saturation, top-down and 45-degree food photography on neutral surfaces; steam and sauce gloss visible.',
    'Consistent crop ratio (4:3 or 1:1) across every card. Rounded corners match the card radius.',
    'Illustrated category icons (flat, 2-3 colours) are fine; do not mix icon styles.',
  ],
  imageQueries: [
    'burger and fries top view',
    'pasta plate restaurant',
    'noodles bowl',
    'restaurant interior warm lighting',
    'grilled chicken dinner table',
    'dessert plating',
  ],
  conversion: [
    'Floating WhatsApp button bottom-right (green, 56px) on every page; back-to-top button above/below it.',
    'Tap-to-call phone chip in the header on mobile.',
    'Primary CTA is the one in the brief (Order Online / Reserve a Table); repeat it in hero, after Popular items, and in the footer.',
    'Search pill ("Search for a dish...") above the menu grid.',
  ],
  mobile: [
    'Header collapses to logo + phone icon + menu; announcement bar becomes a single scrolling line.',
    'Hero stacks: photo on top, offer panel below, full-width button.',
    'Category rail stays horizontally scrollable with snap.',
    'Bottom safe-area padding so the WhatsApp button never covers content or CTAs.',
  ],
  avoid: [
    'Stock-photo collage that does not look like food from the same kitchen.',
    'Tiny prices, grey-on-grey text, or hiding the phone number in the footer.',
    'Auto-playing sound.',
  ],
};

const SALON: DesignDirection = {
  id: 'salon',
  label: 'Salon / Spa / Beauty',
  concept:
    'Calm luxury. Soft light, generous whitespace and editorial photography make the visitor feel pampered before they book. Booking is one tap away at all times.',
  header: [
    'Transparent header over the hero that turns solid on scroll; wordmark logo centered or left, "Book now" pill on the right.',
    'Minimal link set (Services, Gallery, Team, Contact).',
  ],
  hero: [
    'Full-bleed editorial photo (or soft video loop) with a large serif headline and one italic accent word in the accent font.',
    'Frosted-glass booking card (name, service, date) anchored lower-right on desktop.',
  ],
  signatureSections: [
    {
      name: 'Service menu',
      spec: 'Tabbed by category (Hair, Skin, Nails, Bridal). Each row: service name, duration, price "from", thin divider; photo changes with the active tab.',
    },
    {
      name: 'Before / after',
      spec: 'Draggable slider comparisons (placeholders clearly labelled).',
    },
    { name: 'Team', spec: 'Portrait cards with specialty tags; hover reveals a short bio.' },
    {
      name: 'Packages',
      spec: 'Bridal / monthly packages in elevated cards with a highlighted "most booked" one.',
    },
    { name: 'Gallery', spec: 'Masonry grid with lightbox, 8-12 images.' },
    { name: 'Testimonials', spec: 'Large single quote with slow crossfade.' },
  ],
  motion: [
    'Slow parallax on the hero photo (max 40px).',
    'Fade-up reveals, 600ms ease-out.',
    'Image hover: gentle scale 1.03 with a soft overlay.',
  ],
  imagery: [
    'Soft natural light, neutral and blush tones, close-ups of hands, hair texture and products.',
    'Consistent warm colour grade across all images.',
  ],
  imageQueries: [
    'hair salon interior',
    'hairdresser styling',
    'spa treatment candles',
    'bridal makeup',
    'nail art manicure',
    'skincare facial',
  ],
  conversion: [
    'Sticky "Book now" bar on mobile.',
    'WhatsApp booking button floating bottom-right.',
    'Phone and Instagram links in the header or footer.',
  ],
  mobile: [
    'Full-screen slide-in menu with large tap targets.',
    'Service tabs become a horizontal scroll chip row.',
  ],
  avoid: ['Dense price tables without breathing room.', 'Neon colours that fight the calm tone.'],
};

const DENTAL: DesignDirection = {
  id: 'dental',
  label: 'Dental practice',
  concept:
    'Clean, bright and reassuring. A nervous patient should feel safe and see how to book in seconds. Friendly human photography, clear treatments, visible credentials.',
  header: [
    'White sticky header with logo, simple links and a prominent "Book appointment" button; emergency phone number always visible.',
  ],
  hero: [
    'Split hero: warm headline and trust points left (rating, years, painless care), smiling-patient photo right with a soft rounded mask.',
    'Inline appointment request form (name, phone, preferred time).',
  ],
  signatureSections: [
    {
      name: 'Treatment cards',
      spec: 'Icon + title + one-line benefit for Checkups, Whitening, Braces/Aligners, Implants, Root canal, Kids. Opens a short detail panel.',
    },
    {
      name: 'Why choose us',
      spec: 'Three or four proof points with large numbers (rating, patients, experience) taken only from real data.',
    },
    { name: 'Doctor profile', spec: 'Portrait, qualifications as provided, short friendly bio.' },
    {
      name: 'Smile gallery',
      spec: "Before/after slider, labelled as sample if not the clinic's own.",
    },
    { name: 'FAQ', spec: 'Accordion on pain, cost, insurance, first visit.' },
  ],
  motion: ['Subtle fade-ups, count-up numbers, soft hover lift on cards.'],
  imagery: [
    'Bright, airy clinic and smiling patients; cool blues and whites with one warm accent.',
  ],
  imageQueries: [
    'dentist clinic modern',
    'smiling patient teeth',
    'dental checkup',
    'dental equipment clean',
    'family dentist',
  ],
  conversion: [
    'Click-to-call and WhatsApp buttons in header and floating.',
    'Appointment form posts to a mailto/WhatsApp fallback if no backend.',
  ],
  mobile: ['Sticky bottom bar with Call and Book buttons.'],
  avoid: [
    'Graphic clinical imagery.',
    'Stock photos of obviously foreign clinics when the brief provides real photos.',
  ],
};

const LAW_FIRM: DesignDirection = {
  id: 'law-firm',
  label: 'Law firm',
  concept:
    'Authority and calm. Deep tones, serif headlines, restrained motion. The visitor should feel the firm is established and discreet, and know exactly how to request a consultation.',
  header: [
    'Solid dark header, serif wordmark, links plus a "Free consultation" outline button; phone number on the right.',
  ],
  hero: [
    'Dark-overlay architectural or courtroom-style photo, large serif headline, a one-line promise, two buttons (Consultation, Call).',
    'Thin gold/accent rule as a signature detail.',
  ],
  signatureSections: [
    {
      name: 'Practice areas',
      spec: 'Grid of cards with icon, title and two-line summary; hover reveals "Learn more".',
    },
    {
      name: 'Approach / process',
      spec: 'Numbered steps: Consultation, Case review, Strategy, Resolution.',
    },
    {
      name: 'Attorney profiles',
      spec: 'Formal portraits, role, areas of practice (only provided facts).',
    },
    {
      name: 'Results and credentials',
      spec: 'Only real numbers; otherwise omit rather than invent.',
    },
    { name: 'Consultation form', spec: 'Short form with confidentiality note.' },
  ],
  motion: ['Very restrained: fade and 12px rise only.'],
  imagery: [
    'Desaturated, high-contrast architecture, books, handshakes; no cliché gavel stock unless nothing else exists.',
  ],
  imageQueries: [
    'law office interior',
    'lawyer meeting client',
    'courthouse architecture',
    'legal books desk',
  ],
  conversion: ['Click-to-call and WhatsApp; confidentiality reassurance beside every form.'],
  mobile: ['Collapsed menu with the call button persistent.'],
  avoid: ['Win-rate or case-result claims that are not in the data.', 'Playful animation.'],
};

const GYM: DesignDirection = {
  id: 'gym',
  label: 'Gym / Fitness',
  concept:
    'Energy and momentum. Dark base, one electric accent colour, huge condensed type and action photography. The visitor should want to start today and see a trial offer immediately.',
  header: ['Dark sticky header, bold uppercase links, accent-colour "Join now" button.'],
  hero: [
    'Full-bleed training photo or looping video with a dark gradient, massive uppercase headline, offer chip ("First week free"), two buttons.',
    'Scrolling marquee strip of class names beneath the hero.',
  ],
  signatureSections: [
    {
      name: 'Classes',
      spec: 'Cards with photo, intensity meter, duration and coach; filter chips (Strength, Cardio, Yoga, Boxing).',
    },
    { name: 'Timetable', spec: 'Weekly schedule table with today highlighted.' },
    {
      name: 'Membership plans',
      spec: '3 plans in a pricing table, middle one highlighted, clear billing period.',
    },
    { name: 'Trainers', spec: 'Portrait cards with specialty and a short quote.' },
    { name: 'Transformations', spec: "Result cards, labelled as sample if not the gym's own." },
    { name: 'Facilities', spec: 'Icon grid (showers, lockers, parking, AC).' },
  ],
  motion: ['Counter animations, marquee, hover tilt on cards, snappy 250ms easing.'],
  imagery: ['High-contrast action shots, rim lighting, sweat and chalk; consistent dark grade.'],
  imageQueries: [
    'gym weights training',
    'crossfit workout',
    'personal trainer',
    'boxing gym',
    'yoga class',
    'treadmill fitness center',
  ],
  conversion: ['Floating WhatsApp, sticky "Join now" on mobile, trial-pass form.'],
  mobile: ['Bottom sticky CTA bar; schedule becomes day tabs.'],
  avoid: ['Pastel palettes.', 'Body-shaming copy.'],
};

const REAL_ESTATE: DesignDirection = {
  id: 'real-estate',
  label: 'Real estate / Property',
  concept:
    'Aspirational but practical. Big property imagery, instant search and clear contact for every listing. The visitor should be able to shortlist and enquire within two taps.',
  header: [
    'White header with logo, links (Buy, Rent, Projects, About), phone and "List your property" button.',
  ],
  hero: [
    'Full-bleed skyline or home photo with a floating search bar (type, location, budget).',
    'Trust counters below (properties sold, years, agents) from real data only.',
  ],
  signatureSections: [
    {
      name: 'Featured listings',
      spec: 'Cards with big photo, price badge, beds/baths/area icons, location, "Enquire" and WhatsApp buttons.',
    },
    { name: 'Areas we serve', spec: 'Photo tiles per neighbourhood with listing counts if known.' },
    { name: 'Services', spec: 'Buy, sell, rent, valuation, property management.' },
    { name: 'Agent team', spec: 'Portrait cards with direct WhatsApp.' },
    { name: 'Testimonials', spec: 'Real reviews only.' },
  ],
  motion: ['Image carousel on cards, hover zoom, smooth scroll, sticky filters.'],
  imagery: ['Bright exteriors at golden hour and wide interiors; consistent 3:2 crops.'],
  imageQueries: [
    'modern house exterior',
    'apartment living room',
    'real estate agent keys',
    'city skyline residential',
  ],
  conversion: ['WhatsApp enquiry prefilled with the listing name; floating call button.'],
  mobile: ['Search collapses to a single "Find property" button opening a sheet.'],
  avoid: ['Invented prices or listings presented as real; always label sample listings.'],
};

const MEDICAL: DesignDirection = {
  id: 'medical',
  label: 'Medical practice / Clinic',
  concept:
    'Trustworthy and efficient. Calm greens/blues, plain language, clear departments and doctors, and fast appointment access. Accessibility is a first-class concern.',
  header: [
    'Light header with logo, department links, emergency/appointment phone and "Book appointment" button.',
  ],
  hero: [
    'Split hero with a short promise, three trust points and an appointment widget; friendly doctor/patient photo.',
  ],
  signatureSections: [
    { name: 'Departments / services', spec: 'Icon cards with short descriptions.' },
    {
      name: 'Doctors',
      spec: 'Cards with specialty, qualifications (only as provided), timings and a Book button.',
    },
    { name: 'Timings', spec: 'Clear table with today highlighted and emergency note.' },
    { name: 'Patient information', spec: 'FAQ accordion: first visit, documents, insurance.' },
    { name: 'Location', spec: 'Map, parking and directions.' },
  ],
  motion: ['Minimal: fade-ups and focus rings; no autoplay carousels.'],
  imagery: ['Clean, bright, human; avoid graphic procedures.'],
  imageQueries: [
    'clinic reception modern',
    'doctor consulting patient',
    'medical team',
    'stethoscope clinic',
  ],
  conversion: ['Click-to-call, WhatsApp appointment request, sticky mobile Book bar.'],
  mobile: ['Large tap targets (48px), high contrast, no hover-only interactions.'],
  avoid: ['Medical claims, cures or guarantees.', 'Low-contrast pastel text.'],
};

const CORPORATE: DesignDirection = {
  id: 'corporate',
  label: 'Corporate / Professional services',
  concept:
    'Confident and modern. Clear value proposition, strong typography, structured sections and proof. The visitor understands what the company does and how to start a conversation in ten seconds.',
  header: ['Clean sticky header with logo, 4-5 links, a "Contact us" button.'],
  hero: [
    'Bold headline with a highlighted keyword, supporting sentence, two buttons, abstract or team photography on a diagonal or rounded mask.',
    'Logo strip or key figures below.',
  ],
  signatureSections: [
    { name: 'Services', spec: 'Grid of icon cards or alternating image/text rows.' },
    { name: 'Process', spec: 'Numbered horizontal timeline.' },
    { name: 'Why us / proof', spec: 'Metrics, certifications and client logos, only if provided.' },
    { name: 'Case studies', spec: 'Cards with outcome headline; label sample content.' },
    { name: 'Contact', spec: 'Form, map, direct phone and email.' },
  ],
  motion: ['Fade-ups, count-up metrics, subtle hover states.'],
  imagery: ['Real-looking offices and teams, cool neutrals with one brand accent.'],
  imageQueries: [
    'modern office team meeting',
    'business handshake',
    'workspace laptop',
    'corporate building',
  ],
  conversion: ['Primary "Contact us" button repeated after each major section; WhatsApp floating.'],
  mobile: ['Hamburger menu, stacked cards, sticky contact button.'],
  avoid: ['Generic "synergy" copy; every sentence must say something specific.'],
};

export const DESIGN_DIRECTIONS: Record<ThemeCategory, DesignDirection> = {
  restaurant: RESTAURANT,
  salon: SALON,
  dental: DENTAL,
  'law-firm': LAW_FIRM,
  gym: GYM,
  'real-estate': REAL_ESTATE,
  medical: MEDICAL,
  corporate: CORPORATE,
};

export function designDirectionFor(themeId: ThemeCategory): DesignDirection {
  return DESIGN_DIRECTIONS[themeId];
}
