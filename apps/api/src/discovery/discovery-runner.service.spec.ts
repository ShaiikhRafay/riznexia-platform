import { DiscoveryJobStatus, WebsiteStatusType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { RedisCacheService } from '@riznexia/cache';
import type { PlacesAdapter } from '../common/adapters/places.adapter';
import type { WebsiteFetchAdapter } from '../common/adapters/website-fetch.adapter';
import type { WebsiteStatusClassifier } from '../common/classifiers/website-status.classifier';
import type { CostService } from '../common/cost/cost.service';
import type { LeadsService } from '../leads/leads.service';
import { DiscoveryRunnerService } from './discovery-runner.service';

describe('DiscoveryRunnerService', () => {
  let placesAdapter: { searchText: jest.Mock; getWebsiteUri: jest.Mock; getFullDetails: jest.Mock };
  let websiteFetchAdapter: { fetch: jest.Mock };
  let classifier: { classify: jest.Mock };
  let leadsService: { upsertByPlaceId: jest.Mock; existsByPlaceId: jest.Mock };
  let costService: { assertWithinBudget: jest.Mock; recordCost: jest.Mock };
  let prisma: { discoveryJob: { update: jest.Mock } };
  let cache: { getJson: jest.Mock; setJson: jest.Mock; getOrSetJson: jest.Mock };
  let runner: DiscoveryRunnerService;

  const params = { discoveryJobId: 'job-1', city: 'Karachi', category: 'restaurant', radiusKm: 15 };
  const candidate = {
    placeId: 'place_1',
    displayName: "Joe's Diner",
    formattedAddress: '123 Main St',
    primaryType: 'restaurant',
    types: ['restaurant'],
  };

  beforeEach(() => {
    placesAdapter = { searchText: jest.fn(), getWebsiteUri: jest.fn(), getFullDetails: jest.fn() };
    websiteFetchAdapter = { fetch: jest.fn() };
    classifier = { classify: jest.fn() };
    leadsService = { upsertByPlaceId: jest.fn(), existsByPlaceId: jest.fn() };
    costService = { assertWithinBudget: jest.fn(), recordCost: jest.fn() };
    prisma = { discoveryJob: { update: jest.fn().mockResolvedValue({}) } };
    cache = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
      // real cache-aside behavior for tests that don't care about caching specifically
      getOrSetJson: jest.fn(async (_key: string, _ttl: number, compute: () => Promise<unknown>) =>
        compute(),
      ),
    };

    runner = new DiscoveryRunnerService(
      placesAdapter as unknown as PlacesAdapter,
      websiteFetchAdapter as unknown as WebsiteFetchAdapter,
      classifier as unknown as WebsiteStatusClassifier,
      leadsService as unknown as LeadsService,
      costService as unknown as CostService,
      prisma as unknown as PrismaClient,
      cache as unknown as RedisCacheService,
    );
  });

  it('transitions the job to RUNNING then COMPLETED with the correct resultsCount', async () => {
    placesAdapter.searchText.mockResolvedValue([candidate]);
    placesAdapter.getWebsiteUri.mockResolvedValue(null); // no website -> qualifies immediately
    placesAdapter.getFullDetails.mockResolvedValue({
      websiteUri: null,
      rating: null,
      userRatingCount: null,
      reviews: [],
      photos: [],
    });
    leadsService.upsertByPlaceId.mockResolvedValue({ id: 'lead-1', wasNew: true });

    await runner.run(params);

    expect(prisma.discoveryJob.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'job-1' },
      data: { status: DiscoveryJobStatus.RUNNING },
    });
    expect(prisma.discoveryJob.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'job-1' },
      data: { status: DiscoveryJobStatus.COMPLETED, resultsCount: 1 },
    });
  });

  it('marks the job FAILED when the search itself fails (nothing partial to preserve)', async () => {
    costService.assertWithinBudget.mockRejectedValue(new Error('over budget'));

    await runner.run(params);

    expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job-1' },
      data: { status: DiscoveryJobStatus.FAILED },
    });
  });

  it('does not fail the whole job when one candidate errors (FR-1.8)', async () => {
    const goodCandidate = { ...candidate, placeId: 'place_good' };
    const badCandidate = { ...candidate, placeId: 'place_bad' };
    placesAdapter.searchText.mockResolvedValue([goodCandidate, badCandidate]);
    placesAdapter.getWebsiteUri.mockImplementation((placeId: string) => {
      if (placeId === 'place_bad') {
        return Promise.reject(new Error('Places API blew up for this one'));
      }
      return Promise.resolve(null);
    });
    placesAdapter.getFullDetails.mockResolvedValue({
      websiteUri: null,
      rating: null,
      userRatingCount: null,
      reviews: [],
      photos: [],
    });
    leadsService.upsertByPlaceId.mockResolvedValue({ id: 'lead-good', wasNew: true });

    await runner.run(params);

    // the good candidate still got persisted despite the bad one throwing
    expect(leadsService.upsertByPlaceId).toHaveBeenCalledTimes(1);
    expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job-1' },
      data: { status: DiscoveryJobStatus.COMPLETED, resultsCount: 1 },
    });
  });

  describe('website classification tiering', () => {
    it('skips the fetch/classify step entirely when Places reports no website', async () => {
      placesAdapter.searchText.mockResolvedValue([candidate]);
      placesAdapter.getWebsiteUri.mockResolvedValue(null);
      placesAdapter.getFullDetails.mockResolvedValue({
        websiteUri: null,
        rating: null,
        userRatingCount: null,
        reviews: [],
        photos: [],
      });
      leadsService.upsertByPlaceId.mockResolvedValue({ id: 'lead-1', wasNew: true });

      await runner.run(params);

      expect(websiteFetchAdapter.fetch).not.toHaveBeenCalled();
      expect(leadsService.upsertByPlaceId).toHaveBeenCalledWith(
        expect.objectContaining({ websiteStatus: WebsiteStatusType.NONE }),
      );
    });

    it('discards a brand-new candidate that classifies as present, without calling the full-details tier', async () => {
      placesAdapter.searchText.mockResolvedValue([candidate]);
      placesAdapter.getWebsiteUri.mockResolvedValue('https://joesdiner.com');
      websiteFetchAdapter.fetch.mockResolvedValue({
        ok: true,
        html: '<html></html>',
        finalUrl: 'https://joesdiner.com/',
        statusCode: 200,
        errorReason: null,
      });
      classifier.classify.mockResolvedValue({
        status: 'present',
        confidence: 'high',
        resolvedTier: 'heuristic',
      });
      leadsService.existsByPlaceId.mockResolvedValue(false);

      await runner.run(params);

      expect(placesAdapter.getFullDetails).not.toHaveBeenCalled();
      expect(leadsService.upsertByPlaceId).not.toHaveBeenCalled();
      expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
        where: { id: 'job-1' },
        data: { status: DiscoveryJobStatus.COMPLETED, resultsCount: 0 },
      });
    });

    it('refreshes an already-tracked lead that is now present, without paying for full details (FR-1.7)', async () => {
      placesAdapter.searchText.mockResolvedValue([candidate]);
      placesAdapter.getWebsiteUri.mockResolvedValue('https://joesdiner.com');
      websiteFetchAdapter.fetch.mockResolvedValue({
        ok: true,
        html: '<html></html>',
        finalUrl: 'https://joesdiner.com/',
        statusCode: 200,
        errorReason: null,
      });
      classifier.classify.mockResolvedValue({
        status: 'present',
        confidence: 'high',
        resolvedTier: 'heuristic',
      });
      leadsService.existsByPlaceId.mockResolvedValue(true);
      leadsService.upsertByPlaceId.mockResolvedValue({ id: 'lead-1', wasNew: false });

      await runner.run(params);

      expect(placesAdapter.getFullDetails).not.toHaveBeenCalled();
      expect(leadsService.upsertByPlaceId).toHaveBeenCalledWith(
        expect.objectContaining({ websiteStatus: WebsiteStatusType.PRESENT }),
      );
      // refreshing a present lead doesn't count toward this job's *new qualifying* result count
      expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
        where: { id: 'job-1' },
        data: { status: DiscoveryJobStatus.COMPLETED, resultsCount: 0 },
      });
    });

    it('pays for the full-details tier only for a qualifying (outdated) candidate', async () => {
      placesAdapter.searchText.mockResolvedValue([candidate]);
      placesAdapter.getWebsiteUri.mockResolvedValue('http://joesdiner.com');
      websiteFetchAdapter.fetch.mockResolvedValue({
        ok: true,
        html: '<html></html>',
        finalUrl: 'http://joesdiner.com/',
        statusCode: 200,
        errorReason: null,
      });
      classifier.classify.mockResolvedValue({
        status: 'outdated',
        confidence: 'high',
        resolvedTier: 'heuristic',
      });
      placesAdapter.getFullDetails.mockResolvedValue({
        websiteUri: 'http://joesdiner.com',
        rating: 4.2,
        userRatingCount: 30,
        reviews: [],
        photos: [],
      });
      leadsService.upsertByPlaceId.mockResolvedValue({ id: 'lead-1', wasNew: true });

      await runner.run(params);

      expect(placesAdapter.getFullDetails).toHaveBeenCalledWith('place_1');
      expect(costService.recordCost).toHaveBeenCalledWith(
        'google_places_details_full',
        expect.any(Number),
        expect.objectContaining({ placeId: 'place_1' }),
      );
    });

    it('caches the website-check result and skips both Places calls and the fetch on a hit', async () => {
      placesAdapter.searchText.mockResolvedValue([candidate]);
      cache.getJson.mockResolvedValue({ websiteUri: null, status: 'none' });
      placesAdapter.getFullDetails.mockResolvedValue({
        websiteUri: null,
        rating: null,
        userRatingCount: null,
        reviews: [],
        photos: [],
      });
      leadsService.upsertByPlaceId.mockResolvedValue({ id: 'lead-1', wasNew: true });

      await runner.run(params);

      expect(placesAdapter.getWebsiteUri).not.toHaveBeenCalled();
      expect(websiteFetchAdapter.fetch).not.toHaveBeenCalled();
    });
  });
});
