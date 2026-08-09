import Image from 'next/image';
import Link from 'next/link';

// The real Riznexia brand mark (public/brand/riznexia-mark.png, pulled
// directly from riznexia.com) plus a Sora wordmark — the standard
// "compact icon + product name" sidebar pattern, not the full marketing
// lockup (illegible at the sidebar's own width). One implementation,
// reused by both the persistent desktop Sidebar and the mobile Sheet's
// header, so there's never a second copy to drift out of sync.
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className ?? ''}`}>
      <Image
        src="/brand/riznexia-mark.png"
        alt=""
        width={28}
        height={28}
        className="shrink-0 rounded-md"
      />
      <span className="text-h2 text-(--color-text-primary) font-semibold">Riznexia</span>
    </Link>
  );
}
