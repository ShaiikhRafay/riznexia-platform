import type {
  LocationCandidate,
  LocationProvider,
  LocationSearchParams,
} from '../providers/location-provider.interface';

// Module M5 — the page-loop that used to live inside PlacesAdapter.searchText
// itself (pre-M5), now caller-owned so it works uniformly for any
// LocationProvider (search() is one-page-per-call, Doc 21 M5 entry) and so
// both DiscoveryRunnerService and PlaceSyncRunnerService share one
// implementation instead of two copies of the same cap/delay logic.
export interface PaginatedSearchOptions {
  maxPages: number;
  pageDelayMs: number;
  onPage?: (page: { candidates: LocationCandidate[]; pageIndex: number }) => void | Promise<void>;
}

export async function collectSearchPages(
  provider: LocationProvider,
  params: LocationSearchParams,
  options: PaginatedSearchOptions,
): Promise<LocationCandidate[]> {
  const candidates: LocationCandidate[] = [];
  let pageToken: string | undefined;
  let pagesFetched = 0;

  do {
    const page = await provider.search({ ...params, pageToken });
    candidates.push(...page.candidates);

    if (options.onPage) {
      await options.onPage({ candidates: page.candidates, pageIndex: pagesFetched });
    }

    pageToken = page.nextPageToken;
    pagesFetched += 1;

    if (pageToken && pagesFetched < options.maxPages) {
      await sleep(options.pageDelayMs);
    }
  } while (pageToken && pagesFetched < options.maxPages);

  return candidates;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
