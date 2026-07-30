import type { LocationProvider } from '../providers/location-provider.interface';
import { collectSearchPages } from './paginate-search';

function candidate(id: string) {
  return {
    providerId: id,
    displayName: id,
    formattedAddress: '',
    primaryType: null,
    types: [],
    latitude: null,
    longitude: null,
  };
}

describe('collectSearchPages', () => {
  it('returns a single page of candidates when there is no nextPageToken', async () => {
    const provider = { search: jest.fn().mockResolvedValue({ candidates: [candidate('a')] }) };

    const result = await collectSearchPages(
      provider as unknown as LocationProvider,
      { city: 'Karachi' },
      { maxPages: 3, pageDelayMs: 0 },
    );

    expect(result).toEqual([candidate('a')]);
    expect(provider.search).toHaveBeenCalledTimes(1);
  });

  it('follows nextPageToken across pages, forwarding it to the next call', async () => {
    const provider = {
      search: jest
        .fn()
        .mockResolvedValueOnce({ candidates: [candidate('a')], nextPageToken: 'p2' })
        .mockResolvedValueOnce({ candidates: [candidate('b')] }),
    };

    const result = await collectSearchPages(
      provider as unknown as LocationProvider,
      { city: 'Karachi' },
      { maxPages: 3, pageDelayMs: 0 },
    );

    expect(result).toEqual([candidate('a'), candidate('b')]);
    expect(provider.search).toHaveBeenNthCalledWith(2, { city: 'Karachi', pageToken: 'p2' });
  });

  it('stops at maxPages even if a nextPageToken keeps coming back', async () => {
    const provider = {
      search: jest
        .fn()
        .mockResolvedValue({ candidates: [candidate('x')], nextPageToken: 'always-more' }),
    };

    const result = await collectSearchPages(
      provider as unknown as LocationProvider,
      { city: 'Karachi' },
      { maxPages: 2, pageDelayMs: 0 },
    );

    expect(result).toHaveLength(2);
    expect(provider.search).toHaveBeenCalledTimes(2);
  });

  it('invokes onPage once per fetched page with that page only', async () => {
    const provider = {
      search: jest
        .fn()
        .mockResolvedValueOnce({ candidates: [candidate('a')], nextPageToken: 'p2' })
        .mockResolvedValueOnce({ candidates: [candidate('b')] }),
    };
    const onPage = jest.fn();

    await collectSearchPages(
      provider as unknown as LocationProvider,
      { city: 'Karachi' },
      { maxPages: 3, pageDelayMs: 0, onPage },
    );

    expect(onPage).toHaveBeenCalledTimes(2);
    expect(onPage).toHaveBeenNthCalledWith(1, { candidates: [candidate('a')], pageIndex: 0 });
    expect(onPage).toHaveBeenNthCalledWith(2, { candidates: [candidate('b')], pageIndex: 1 });
  });
});
