// Builds a `?a=1&b=2` query string from a flat params object, skipping
// `undefined`/`null`/empty-string values — the one place every feature
// hook builds a GET query string, so a param never gets silently
// stringified as `"undefined"`. Generic over `T extends object` (rather
// than `Record<string, ...>`) so a concrete query-options interface can be
// passed directly, without TypeScript demanding it declare its own index
// signature.
export function toQueryString<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [
    string,
    string | number | undefined | null,
  ][]) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
