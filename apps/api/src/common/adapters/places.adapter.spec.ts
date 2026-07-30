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
    config = { get: jest.fn().mockReturnValue('test-api-key') };
    adapter = new PlacesAdapter(config as unknown as ConfigService);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('searchText', () => {
    it('returns one page of candidates with no nextPageToken', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          places: [
            {
              id: 'place_1',
              displayName: { text: "Joe's Diner" },
              formattedAddress: '123 Main St',
              types: ['restaurant', 'food'],
              primaryType: 'restaurant',
              location: { latitude: 24.86, longitude: 67.01 },
            },
          ],
        }),
      );

      const result = await adapter.searchText({ city: 'Karachi', category: 'restaurant' });

      expect(result).toEqual({
        candidates: [
          {
            placeId: 'place_1',
            displayName: "Joe's Diner",
            formattedAddress: '123 Main St',
            primaryType: 'restaurant',
            types: ['restaurant', 'food'],
            latitude: 24.86,
            longitude: 67.01,
          },
        ],
        nextPageToken: undefined,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not loop internally — one call, one page, caller owns pagination', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { places: [{ id: 'p1' }], nextPageToken: 'token_2' }),
      );

      const result = await adapter.searchText({ city: 'Karachi', category: 'restaurant' });

      expect(result.nextPageToken).toBe('token_2');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('forwards a provided pageToken in the request body', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { places: [] }));
      await adapter.searchText({ city: 'Karachi', category: 'restaurant', pageToken: 'token_2' });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as { pageToken?: string };
      expect(body.pageToken).toBe('token_2');
    });

    it('uses the cheap search field mask, not the full details one', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { places: [] }));
      await adapter.searchText({ city: 'Karachi', category: 'restaurant' });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['X-Goog-FieldMask']).toContain('places.displayName');
      expect(headers['X-Goog-FieldMask']).not.toContain('reviews');
    });

    it('builds a natural-language textQuery from category + city', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { places: [] }));
      await adapter.searchText({ city: 'Lahore', category: 'salon' });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as { textQuery: string };
      expect(body.textQuery).toBe('hair salons in Lahore');
    });

    it('prefers keyword over category when both are given', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { places: [] }));
      await adapter.searchText({ city: 'Lahore', category: 'salon', keyword: 'barbershop' });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as { textQuery: string };
      expect(body.textQuery).toBe('barbershop in Lahore');
    });
  });

  describe('searchNearby', () => {
    it('sends a circle location restriction built from latitude/longitude/radius', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { places: [] }));
      await adapter.searchNearby({ latitude: 24.86, longitude: 67.01, radiusMeters: 5000 });

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/places:searchNearby');
      const body = JSON.parse(options.body as string) as {
        locationRestriction: {
          circle: { center: { latitude: number; longitude: number }; radius: number };
        };
      };
      expect(body.locationRestriction.circle).toEqual({
        center: { latitude: 24.86, longitude: 67.01 },
        radius: 5000,
      });
    });

    it('includes the category as includedTypes when provided', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { places: [] }));
      await adapter.searchNearby({
        latitude: 24.86,
        longitude: 67.01,
        radiusMeters: 5000,
        category: 'restaurant',
      });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as { includedTypes?: string[] };
      expect(body.includedTypes).toEqual(['restaurant']);
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
    it('maps every widened field (Module M5), defaulting missing ones safely', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          websiteUri: 'https://joesdiner.com',
          rating: 4.5,
          userRatingCount: 120,
          reviews: [
            { rating: 5, text: { text: 'Great food' }, publishTime: '2026-01-01T00:00:00Z' },
          ],
          photos: [{ name: 'places/place_1/photos/abc' }],
          internationalPhoneNumber: '+92 300 1234567',
          location: { latitude: 24.86, longitude: 67.01 },
          regularOpeningHours: { weekdayDescriptions: ['Mon: 9am-5pm'] },
          businessStatus: 'OPERATIONAL',
          googleMapsUri: 'https://maps.google.com/?cid=123',
        }),
      );

      const result = await adapter.getFullDetails('place_1');

      expect(result).toEqual({
        websiteUri: 'https://joesdiner.com',
        rating: 4.5,
        userRatingCount: 120,
        reviews: [{ rating: 5, text: 'Great food', publishTime: '2026-01-01T00:00:00Z' }],
        photos: [{ name: 'places/place_1/photos/abc' }],
        phone: '+92 300 1234567',
        latitude: 24.86,
        longitude: 67.01,
        openingHours: { weekdayDescriptions: ['Mon: 9am-5pm'] },
        businessStatus: 'OPERATIONAL',
        googleMapsUri: 'https://maps.google.com/?cid=123',
      });
    });

    it('requests the widened field mask including phone/location/hours/status/mapsUri', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, {}));
      await adapter.getFullDetails('place_1');

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      const mask = headers['X-Goog-FieldMask'];
      expect(mask).toContain('internationalPhoneNumber');
      expect(mask).toContain('location');
      expect(mask).toContain('regularOpeningHours');
      expect(mask).toContain('businessStatus');
      expect(mask).toContain('googleMapsUri');
    });

    it('defaults reviews/photos/optional fields safely when Google omits them', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { websiteUri: null }));
      const result = await adapter.getFullDetails('place_1');
      expect(result.reviews).toEqual([]);
      expect(result.photos).toEqual([]);
      expect(result.phone).toBeNull();
      expect(result.latitude).toBeNull();
      expect(result.businessStatus).toBeNull();
    });
  });

  describe('error handling', () => {
    it('maps a 400 response to BadRequestException (not retryable)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(400, { error: { message: 'Invalid city' } }));
      await expect(adapter.searchText({ city: '', category: 'restaurant' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
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
