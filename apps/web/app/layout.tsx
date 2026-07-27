import type { Metadata } from 'next';
import './globals.css';

// Root layout — scaffolding only. Auth (Clerk), the app shell (sidebar/top
// bar, Doc 17 §7), and TanStack Query's provider land with the feature
// modules per Doc 21, not here.
export const metadata: Metadata = {
  title: 'Riznexia',
  description: 'Internal AI sales platform for Riznexia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
