// A Business.photos entry (Module M5) is an opaque Google Places photo
// reference token, not a fetchable URL — resolving it into a real image
// requires a signed call to the Places Photo API with a key, which is a
// deployment-time configuration concern, not something Website Assembly
// (a deterministic, no-network-call generator) can or should do. If the
// site owner sets NEXT_PUBLIC_GOOGLE_PLACES_API_KEY (standard Next.js
// env-var configuration, not a code edit), photo references resolve to
// real images automatically; otherwise the section components render
// without that image rather than a broken one — never a fabricated URL.
export function resolvePlacePhotoUrl(photoReference: string, maxWidthPx = 1200): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return null;
  }
  return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`;
}
