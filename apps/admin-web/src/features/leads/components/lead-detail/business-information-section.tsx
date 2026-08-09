import type { Lead } from '@riznexia/shared-types';
import { DetailCard } from './detail-card';
import { FieldRow } from './field-row';

const WEBSITE_STATUS_LABELS: Record<Lead['websiteStatus'], string> = {
  none: 'No website',
  outdated: 'Outdated website',
  present: 'Website present',
};

// Business Information (F4): exactly the fields `GET /leads/:id` returns
// for the joined Business — businessName/category/city/address/
// websiteStatus. No phone/rating/photos/lat-long here (see Contact
// Information / Google Places Information sections) — those aren't part
// of this response.
export function BusinessInformationSection({ lead }: { lead: Lead }) {
  return (
    <DetailCard title="Business Information">
      <FieldRow label="Business Name">{lead.businessName}</FieldRow>
      <FieldRow label="Category">{lead.category}</FieldRow>
      <FieldRow label="City">{lead.city}</FieldRow>
      <FieldRow label="Address">{lead.address}</FieldRow>
      <FieldRow label="Website Status">{WEBSITE_STATUS_LABELS[lead.websiteStatus]}</FieldRow>
    </DetailCard>
  );
}
