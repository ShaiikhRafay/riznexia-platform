// Derives a Vercel-safe project name from the business — deterministic
// per business (same name every deploy, so redeploys land on the same
// provider project rather than creating a new one each time).
export function toProjectName(businessName: string, businessId: string): string {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'site'}-${businessId.slice(0, 8)}`;
}
