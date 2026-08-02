import type { Metadata, Viewport } from 'next';
import './globals.css';
import './theme-tokens.css';

// Static for every generated site — per-business title/description/
// OpenGraph/Twitter/canonical metadata is exported from the generated
// app/page.tsx instead (Next.js merges page-level metadata over this).
// `metadataBase` resolves every relative canonical/OpenGraph URL the
// generated page.tsx declares; NEXT_PUBLIC_SITE_URL is a deploy-time env
// var (same convention as the Google Places API key in lib/image-utils.ts)
// so the real production domain is never a manual code edit.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* WCAG AA / keyboard navigation requirement — the first focusable
            element on every page, always present regardless of which
            sections a given business's manifest produced. */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
