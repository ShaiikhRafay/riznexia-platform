import { DetailCard } from './detail-card';

// Contact Information / Google Places Information (F4, founder-approved
// resolution): `GET /leads/:id` doesn't return phone, rating, review
// count, photos, opening hours, googlePlaceId, or lat/long — no endpoint
// anywhere exposes them for a lead's business (verified against
// `lead-response.dto.ts` and every controller in apps/api/src). Rendered
// in the page layout exactly as specified, honest about the gap rather
// than fabricating data or silently omitting the section.
export function NotAvailableSection({ title }: { title: string }) {
  return (
    <DetailCard title={title}>
      <p className="text-(--color-text-secondary) text-sm">
        Not available — not returned by the current API.
      </p>
    </DetailCard>
  );
}
