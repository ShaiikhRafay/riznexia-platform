import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SourcedLink, SourcedText } from '@/lib/types';

export interface MapEmbedProps {
  address: SourcedText;
  mapEmbedUrl?: SourcedLink;
}

// `mapEmbedUrl` (Business.googleBusinessUrl, or a maps.google.com/?q=lat,lng
// fallback) is a regular Google Maps link, not a genuinely embeddable
// iframe src (that requires a separate, signed Maps Embed API call) — so
// this renders the address plus a real external link, never a broken or
// misleading <iframe>.
export function MapEmbed({ address, mapEmbedUrl }: MapEmbedProps) {
  return (
    <div className="gap-token-sm border-border p-token-md flex flex-col items-start rounded-lg border">
      <div className="gap-token-xs flex items-center">
        <MapPin className="text-primary h-5 w-5" aria-hidden="true" />
        <p className="text-base">{address.value}</p>
      </div>
      {mapEmbedUrl?.value.url && (
        <Button asChild variant="outline">
          <a href={mapEmbedUrl.value.url} target="_blank" rel="noopener noreferrer">
            View on Google Maps
          </a>
        </Button>
      )}
    </div>
  );
}
