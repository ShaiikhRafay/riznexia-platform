import { BadRequestException } from '@nestjs/common';
import type { PlacesAdapter } from '../adapters/places.adapter';
import { GooglePlacesProvider } from './google-places.provider';

describe('GooglePlacesProvider', () => {
  let placesAdapter: {
    searchText: jest.Mock;
    searchNearby: jest.Mock;
    getWebsiteUri: jest.Mock;
    getFullDetails: jest.Mock;
  };
  let provider: GooglePlacesProvider;

  beforeEach(() => {
    placesAdapter = {
      searchText: jest.fn(),
      searchNearby: jest.fn(),
      getWebsiteUri: jest.fn(),
      getFullDetails: jest.fn(),
    };
    provider = new GooglePlacesProvider(placesAdapter as unknown as PlacesAdapter);
  });

  it('exposes "GOOGLE" as its name', () => {
    expect(provider.name).toBe('GOOGLE');
  });

  describe('search', () => {
    it('routes to searchNearby when latitude/longitude are given', async () => {
      placesAdapter.searchNearby.mockResolvedValue({ candidates: [], nextPageToken: undefined });

      await provider.search({
        latitude: 24.86,
        longitude: 67.01,
        radiusMeters: 5000,
        category: 'restaurant',
      });

      expect(placesAdapter.searchNearby).toHaveBeenCalledWith({
        latitude: 24.86,
        longitude: 67.01,
        radiusMeters: 5000,
        category: 'restaurant',
        pageToken: undefined,
      });
      expect(placesAdapter.searchText).not.toHaveBeenCalled();
    });

    it('defaults radiusMeters to 15km when coordinates are given without one', async () => {
      placesAdapter.searchNearby.mockResolvedValue({ candidates: [], nextPageToken: undefined });
      await provider.search({ latitude: 24.86, longitude: 67.01 });
      expect(placesAdapter.searchNearby).toHaveBeenCalledWith(
        expect.objectContaining({ radiusMeters: 15_000 }),
      );
    });

    it('routes to searchText when only city is given', async () => {
      placesAdapter.searchText.mockResolvedValue({ candidates: [], nextPageToken: undefined });

      await provider.search({ city: 'Karachi', category: 'restaurant' });

      expect(placesAdapter.searchText).toHaveBeenCalledWith({
        city: 'Karachi',
        category: 'restaurant',
        keyword: undefined,
        pageToken: undefined,
      });
      expect(placesAdapter.searchNearby).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when neither city nor coordinates are given', async () => {
      await expect(provider.search({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('maps PlacesCandidate to LocationCandidate (placeId -> providerId)', async () => {
      placesAdapter.searchText.mockResolvedValue({
        candidates: [
          {
            placeId: 'place_1',
            displayName: "Joe's Diner",
            formattedAddress: '123 Main St',
            primaryType: 'restaurant',
            types: ['restaurant'],
            latitude: 24.86,
            longitude: 67.01,
          },
        ],
        nextPageToken: 'p2',
      });

      const result = await provider.search({ city: 'Karachi', category: 'restaurant' });

      expect(result).toEqual({
        candidates: [
          {
            providerId: 'place_1',
            displayName: "Joe's Diner",
            formattedAddress: '123 Main St',
            primaryType: 'restaurant',
            types: ['restaurant'],
            latitude: 24.86,
            longitude: 67.01,
          },
        ],
        nextPageToken: 'p2',
      });
    });
  });

  describe('getWebsiteUri', () => {
    it('delegates to the adapter', async () => {
      placesAdapter.getWebsiteUri.mockResolvedValue('https://example.com');
      await expect(provider.getWebsiteUri('place_1')).resolves.toBe('https://example.com');
      expect(placesAdapter.getWebsiteUri).toHaveBeenCalledWith('place_1');
    });
  });

  describe('getDetails', () => {
    it('maps PlaceFullDetails to LocationDetails, including googleMapsUri -> profileUrl', async () => {
      placesAdapter.getFullDetails.mockResolvedValue({
        websiteUri: 'https://example.com',
        rating: 4.5,
        userRatingCount: 10,
        reviews: [],
        photos: [],
        phone: '+92 300 1234567',
        latitude: 24.86,
        longitude: 67.01,
        openingHours: { weekdayDescriptions: [] },
        businessStatus: 'OPERATIONAL',
        googleMapsUri: 'https://maps.google.com/?cid=1',
      });

      const result = await provider.getDetails('place_1');

      expect(result).toEqual({
        websiteUri: 'https://example.com',
        phone: '+92 300 1234567',
        rating: 4.5,
        userRatingCount: 10,
        latitude: 24.86,
        longitude: 67.01,
        openingHours: { weekdayDescriptions: [] },
        photos: [],
        reviews: [],
        businessStatus: 'OPERATIONAL',
        profileUrl: 'https://maps.google.com/?cid=1',
      });
    });

    it('maps an unrecognized businessStatus to null rather than passing it through', async () => {
      placesAdapter.getFullDetails.mockResolvedValue({
        websiteUri: null,
        rating: null,
        userRatingCount: null,
        reviews: [],
        photos: [],
        phone: null,
        latitude: null,
        longitude: null,
        openingHours: null,
        businessStatus: 'BUSINESS_STATUS_UNSPECIFIED',
        googleMapsUri: null,
      });

      const result = await provider.getDetails('place_1');
      expect(result.businessStatus).toBeNull();
    });
  });
});
