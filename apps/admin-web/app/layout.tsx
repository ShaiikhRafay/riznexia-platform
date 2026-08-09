import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { JetBrains_Mono, Inter, Sora } from 'next/font/google';
import { Providers } from '@/src/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' });
// riznexia.com's own display face, headings only (globals.css's
// `--font-display`) — matches the marketing site's Sora/Inter pairing.
const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display-loaded',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Riznexia',
  description: 'Riznexia AI Website Factory — internal dashboard',
};

// Root layout stays a server component; every client-only concern (theme,
// query client, toasts) lives in <Providers> (frontend architecture review
// §5). `suppressHydrationWarning` on <html> is required by next-themes —
// its blocking inline script sets the `dark`/light class before React
// hydrates, which is an intentional, expected mismatch, not a bug.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable}`}
      >
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
