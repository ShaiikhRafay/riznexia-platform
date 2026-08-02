export interface FooterProps {
  businessName: string;
  columns: number;
}

// The page's final "section" (every M7 theme's sectionOrder ends with a
// literal 'footer' entry, mapped to zero components — Module M8.1/M8.2)
// renders as a real semantic <footer>, not an empty <section>. Content
// here is structural boilerplate (business name + current year), not
// bound business content — no ContentManifest field exists for a footer,
// same "no fabricated content" discipline as every other unsourced slot.
export function Footer({ businessName, columns }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border bg-secondary/40 py-token-lg border-t">
      <div
        className={`gap-token-md px-token-md mx-auto grid max-w-6xl ${columns >= 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : ''}`}
      >
        <p className="text-sm opacity-75">
          © {year} {businessName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
