// Deterministic EN + Roman Urdu outreach drafts. Pure, no AI call, so the
// reps get an instant draft that never invents facts: only the data passed
// in (business, city, rating, live link) is used. Reps edit before saving.

export type DraftLanguage = 'en' | 'roman_ur';
export type DraftChannel = 'whatsapp' | 'email';

export interface DraftInput {
  language: DraftLanguage;
  channel: DraftChannel;
  businessName: string;
  city: string;
  category?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  liveUrl: string | null;
  senderName?: string | null;
  offer?: string | null; // free text the rep types, e.g. "Rs 25,000 one-time, 1 year hosting"
}

export interface DraftOutput {
  title: string;
  content: string;
}

const COMPANY = 'Riznexia';

function ratingLine(input: DraftInput): string | null {
  if (input.rating == null || input.rating <= 0) return null;
  const n = input.reviewCount && input.reviewCount > 0 ? input.reviewCount : null;
  return n ? `${input.rating}/5 (${n})` : `${input.rating}/5`;
}

export function buildDraft(input: DraftInput): DraftOutput {
  const { businessName: b, city } = input;
  const link = input.liveUrl ?? '[live link yahan lagayein]';
  const sender = input.senderName?.trim() || `${COMPANY} team`;
  const rating = ratingLine(input);
  const offer = input.offer?.trim();

  if (input.language === 'roman_ur') {
    const intro = rating
      ? `Assalam o Alaikum! Main ${sender} ${COMPANY} se bol raha hoon. Google par ${b} (${city}) ki rating ${rating} dekhi, bohat acha laga.`
      : `Assalam o Alaikum! Main ${sender} ${COMPANY} se bol raha hoon. ${b} (${city}) ka kaam dekha.`;
    const body = [
      intro,
      '',
      `Hum ne ${b} ke liye ek demo website tayyar ki hai taake aap online customers ko apna kaam khubsurti se dikha sakein. Yeh aap ke kahe baghair free mein banayi gayi hai, aap bas ek nazar daal lein:`,
      link,
      '',
      'Is website mein:',
      '- Mobile par tez aur saaf design',
      '- Call aur WhatsApp ka direct button',
      '- Menu/services, gallery aur location sab ek jagah',
      '',
      offer
        ? `Agar pasand aaye to hamari offer: ${offer}`
        : 'Agar pasand aaye to hum isay aap ke naam/domain par live kar dete hain aur aap ke mutabiq badal dete hain.',
      '',
      'Aap ke liye kab baat karna munasib rahega?',
      `- ${sender}, ${COMPANY}`,
    ].join('\n');
    if (input.channel === 'email') {
      return {
        title: `${b} ke liye demo website`,
        content: `Subject: ${b} ke liye tayyar demo website\n\n${body}`,
      };
    }
    return { title: `${b} - Roman Urdu pitch`, content: body };
  }

  const intro = rating
    ? `Hello! This is ${sender} from ${COMPANY}. I came across ${b} in ${city} and noticed your ${rating} Google rating, great work.`
    : `Hello! This is ${sender} from ${COMPANY}. I came across ${b} in ${city}.`;
  const body = [
    intro,
    '',
    `We put together a free demo website for ${b} so customers can discover you online. No obligation, please take a look:`,
    link,
    '',
    'What it includes:',
    '- Fast, mobile-first design',
    '- One-tap call and WhatsApp buttons',
    '- Your services/menu, gallery and location in one place',
    '',
    offer
      ? `If you like it, our offer: ${offer}`
      : 'If you like it, we can put it on your own domain and tailor it to your needs.',
    '',
    'When would be a good time to chat?',
    `- ${sender}, ${COMPANY}`,
  ].join('\n');
  if (input.channel === 'email') {
    return {
      title: `${b} - demo website proposal`,
      content: `Subject: A free demo website for ${b}\n\n${body}`,
    };
  }
  return { title: `${b} - English pitch`, content: body };
}

export function waLink(phone: string | null | undefined, text: string, cc = '92'): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = cc + d.slice(1);
  if (d.length < 10 || d.length > 15) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
