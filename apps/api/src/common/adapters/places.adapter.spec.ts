import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { UpstreamProviderException } from '../exceptions/app.exception';
import { PlacesAdapter } from './places.adapter';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('PlacesAdapter', () => {
  let config: { get: jest.Mock };
  let adapter: PlacesAdapter;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    config = { get: jest.fn().mockReturnValue('test-api-key') };
    adapter = new PlacesAdapter(config as unknown as ConfigService);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('searchText', () => {
    it('returns candidates from a single page with no nextPageToken', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          places: [
            {
              id: 'place_1',
              displayName: { text: "Joe's Diner" },
              formattedAddress: '123 Main St',
              types: ['restaurant', 'food'],
              primaryType: 'restaurant',
            },
          ],
        }),
      );

      const result = await adapter.searchText({
        city: 'Karachi',
        category: 'restaurant',
        radiusKm: 15,
      });

      expect(result).toEqual([
        {
          placeId: 'place_1',
          displayName: "Joe's Diner",
          formattedAddress: '123 Main St',
          primaryType: 'restaurant',
          types: ['restaurant', 'food'],
        },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('uses the cheap search field mask, not the full details one', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { places: [] }));
      await adapter.searchText({ city: 'Karachi', category: 'restaurant', radiusKm: 15 });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['X-Goog-FieldMask']).toContain('places.displayName');
      expect(headers['X-Goog-FieldMask']).not.toContain('reviews');
    });

    it('builds a natural-language textQuery from category + city', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { places: [] }));
      await adapter.searchText({ city: 'Lahore', category: 'salon', radiusKm: 15 });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as { textQuery: string };
      expect(body.textQuery).toBe('hair salons in Lahore');
    });

    it('paginates up to the 3-page cap, waiting between pages for the token to become valid', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, { places: [{ id: 'p1' }], nextPageToken: 'token_2' }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, { places: [{ id: 'p2' }], nextPageToken: 'token_3' }),
        )
        .mockResolvedValueOnce(jsonResponse(200, { places: [{ id: 'p3' }] }));

      const promise = adapter.searchText({ city: 'Karachi', category: 'restaurant', radiusKm: 15 });
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toHaveLength(3);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('stops at 3 pages even if Google still returns a nextPageToken', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { places: [{ id: 'p' }], nextPageToken: 'always-more' }),
      );

      const promise = adapter.searchText({ city: 'Karachi', category: 'restaurant', radiusKm: 15 });
      await jest.runAllTimersAsync();
      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('getWebsiteUri', () => {
    it('returns the website when present', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { websiteUri: 'https://joesdiner.com' }));
      await expect(adapter.getWebsiteUri('place_1')).resolves.toBe('https://joesdiner.com');
    });

    it('returns null when absent', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, {}));
      await expect(adapter.getWebsiteUri('place_1')).resolves.toBeNull();
    });

    it('requests only the websiteUri field mask (the cheap tier)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, {}));
      await adapter.getWebsiteUri('place_1');

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['X-Goog-FieldMask']).toBe('websiteUri');
    });
  });

  describe('getFullDetails', () => {
    it('maps reviews and photos, defaulting missing fields safely', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          websiteUri: 'https://joesdiner.com',
          rating: 4.5,
          userRatingCount: 120,
          reviews: [
            { rating: 5, text: { text: 'Great food' }, publishTime: '2026-01-01T00:00:00Z' },
          ],
          photos: [{ name: 'places/place_1/photos/abc' }],
        }),
      );

      const result = await adapter.getFullDetails('place_1');

      expect(result).toEqual({
        websiteUri: 'https://joesdiner.com',
        rating: 4.5,
        userRatingCount: 120,
        reviews: [{ rating: 5, text: 'Great food', publishTime: '2026-01-01T00:00:00Z' }],
        photos: [{ name: 'places/place_1/photos/abc' }],
      });
    });

    it('defaults reviews/photos to empty arrays when Google omits them', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { websiteUri: null }));
      const result = await adapter.getFullDetails('place_1');
      expect(result.reviews).toEqual([]);
      expect(result.photos).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('maps a 400 response to BadRequestException (not retryable)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(400, { error: { message: 'Invalid city' } }));
      await expect(
        adapter.searchText({ city: '', category: 'restaurant', radiusKm: 15 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('maps a 429/5xx response to UpstreamProviderException', async () => {
      fetchMock.mockResolvedValue(jsonResponse(429, { error: { message: 'Quota exceeded' } }));
      await expect(adapter.getWebsiteUri('place_1')).rejects.toBeInstanceOf(
        UpstreamProviderException,
      );
    });

    it('maps a network failure to UpstreamProviderException', async () => {
      fetchMock.mockRejectedValue(new Error('fetch failed'));
      await expect(adapter.getWebsiteUri('place_1')).rejects.toBeInstanceOf(
        UpstreamProviderException,
      );
    });

    it('throws UpstreamProviderException when the API key is not configured', async () => {
      config.get.mockReturnValue(undefined);
      await expect(adapter.getWebsiteUri('place_1')).rejects.toBeInstanceOf(
        UpstreamProviderException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
