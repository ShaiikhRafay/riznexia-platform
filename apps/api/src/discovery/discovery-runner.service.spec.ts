import { DiscoveryJobStatus, WebsiteDetectionMethod, WebsiteStatusType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { RedisCacheService } from '@riznexia/cache';
import type { LocationProvider } from '../common/providers/location-provider.interface';
import type { WebsiteFetchAdapter } from '../common/adapters/website-fetch.adapter';
import type { WebsiteStatusClassifier } from '../common/classifiers/website-status.classifier';
import type { CostService } from '../common/cost/cost.service';
import type { BusinessService } from '../business/business.service';
import type { LeadsService } from '../leads/leads.service';
import { DiscoveryRunnerService } from './discovery-runner.service';

function detailsFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    websiteUri: null,
    rating: null,
    userRatingCount: null,
    reviews: [],
    photos: [],
    phone: null,
    latitude: null,
    longitude: null,
    openingHours: null,
    businessStatus: null,
    profileUrl: null,
    ...overrides,
  };
}

describe('DiscoveryRunnerService', () => {
  let locationProvider: { search: jest.Mock; getWebsiteUri: jest.Mock; getDetails: jest.Mock };
  let websiteFetchAdapter: { fetch: jest.Mock };
  let classifier: { classify: jest.Mock };
  let businessService: { findByPlaceId: jest.Mock; upsertByPlaceId: jest.Mock };
  let leadsService: { ensureForBusiness: jest.Mock };
  let costService: { charge: jest.Mock };
  let prisma: { discoveryJob: { update: jest.Mock } };
  let cache: { getJson: jest.Mock; setJson: jest.Mock; getOrSetJson: jest.Mock };
  let runner: DiscoveryRunnerService;

  const params = { discoveryJobId: 'job-1', city: 'Karachi', category: 'restaurant', radiusKm: 15 };
  const candidate = {
    providerId: 'place_1',
    displayName: "Joe's Diner",
    formattedAddress: '123 Main St',
    primaryType: 'restaurant',
    types: ['restaurant'],
    latitude: null,
    longitude: null,
  };

  beforeEach(() => {
    locationProvider = { search: jest.fn(), getWebsiteUri: jest.fn(), getDetails: jest.fn() };
    websiteFetchAdapter = { fetch: jest.fn() };
    classifier = { classify: jest.fn() };
    businessService = { findByPlaceId: jest.fn(), upsertByPlaceId: jest.fn() };
    leadsService = { ensureForBusiness: jest.fn() };
    costService = { charge: jest.fn().mockResolvedValue(undefined) };
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
      locationProvider as unknown as LocationProvider,
      websiteFetchAdapter as unknown as WebsiteFetchAdapter,
      classifier as unknown as WebsiteStatusClassifier,
      businessService as unknown as BusinessService,
      leadsService as unknown as LeadsService,
      costService as unknown as CostService,
      prisma as unknown as PrismaClient,
      cache as unknown as RedisCacheService,
    );
  });

  it('transitions the job to RUNNING then COMPLETED with the correct resultsCount', async () => {
    locationProvider.search.mockResolvedValue({
      candidates: [candidate],
      nextPageToken: undefined,
    });
    locationProvider.getWebsiteUri.mockResolvedValue(null); // no website -> qualifies immediately
    locationProvider.getDetails.mockResolvedValue(detailsFixture());
    businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: true });
    leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-1', wasNew: true });

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
    costService.charge.mockRejectedValue(new Error('over budget'));

    await runner.run(params);

    expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job-1' },
      data: { status: DiscoveryJobStatus.FAILED },
    });
  });

  it('does not fail the whole job when one candidate errors (FR-1.8)', async () => {
    const goodCandidate = { ...candidate, providerId: 'place_good' };
    const badCandidate = { ...candidate, providerId: 'place_bad' };
    locationProvider.search.mockResolvedValue({
      candidates: [goodCandidate, badCandidate],
      nextPageToken: undefined,
    });
    locationProvider.getWebsiteUri.mockImplementation((providerId: string) => {
      if (providerId === 'place_bad') {
        return Promise.reject(new Error('Places API blew up for this one'));
      }
      return Promise.resolve(null);
    });
    locationProvider.getDetails.mockResolvedValue(detailsFixture());
    businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-good', wasNew: true });
    leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-good', wasNew: true });

    await runner.run(params);

    // the good candidate still got persisted despite the bad one throwing
    expect(businessService.upsertByPlaceId).toHaveBeenCalledTimes(1);
    expect(leadsService.ensureForBusiness).toHaveBeenCalledTimes(1);
    expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job-1' },
      data: { status: DiscoveryJobStatus.COMPLETED, resultsCount: 1 },
    });
  });

  describe('website classification tiering', () => {
    it('skips the fetch/classify step entirely when Places reports no website', async () => {
      locationProvider.search.mockResolvedValue({
        candidates: [candidate],
        nextPageToken: undefined,
      });
      locationProvider.getWebsiteUri.mockResolvedValue(null);
      locationProvider.getDetails.mockResolvedValue(detailsFixture());
      businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: true });
      leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-1', wasNew: true });

      await runner.run(params);

      expect(websiteFetchAdapter.fetch).not.toHaveBeenCalled();
      expect(businessService.upsertByPlaceId).toHaveBeenCalledWith(
        expect.objectContaining({
          websiteStatus: WebsiteStatusType.NONE,
          websiteDetectionMethod: WebsiteDetectionMethod.GOOGLE_API,
        }),
      );
    });

    it('discards a brand-new candidate that classifies as present, without calling the full-details tier or recording a Business', async () => {
      locationProvider.search.mockResolvedValue({
        candidates: [candidate],
        nextPageToken: undefined,
      });
      locationProvider.getWebsiteUri.mockResolvedValue('https://joesdiner.com');
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
      businessService.findByPlaceId.mockResolvedValue(null);

      await runner.run(params);

      expect(locationProvider.getDetails).not.toHaveBeenCalled();
      expect(businessService.upsertByPlaceId).not.toHaveBeenCalled();
      expect(leadsService.ensureForBusiness).not.toHaveBeenCalled();
      expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
        where: { id: 'job-1' },
        data: { status: DiscoveryJobStatus.COMPLETED, resultsCount: 0 },
      });
    });

    it('refreshes an already-discovered business that is now present, without paying for full details or touching Lead (FR-1.7)', async () => {
      locationProvider.search.mockResolvedValue({
        candidates: [candidate],
        nextPageToken: undefined,
      });
      locationProvider.getWebsiteUri.mockResolvedValue('https://joesdiner.com');
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
      businessService.findByPlaceId.mockResolvedValue({ id: 'biz-1' });
      businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: false });

      await runner.run(params);

      expect(locationProvider.getDetails).not.toHaveBeenCalled();
      expect(businessService.upsertByPlaceId).toHaveBeenCalledWith(
        expect.objectContaining({ websiteStatus: WebsiteStatusType.PRESENT }),
      );
      expect(leadsService.ensureForBusiness).not.toHaveBeenCalled();
      // refreshing a present business doesn't count toward this job's *new qualifying* result count
      expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
        where: { id: 'job-1' },
        data: { status: DiscoveryJobStatus.COMPLETED, resultsCount: 0 },
      });
    });

    it('pays for the full-details tier only for a qualifying (outdated) candidate, then upserts Business and ensures a Lead', async () => {
      locationProvider.search.mockResolvedValue({
        candidates: [candidate],
        nextPageToken: undefined,
      });
      locationProvider.getWebsiteUri.mockResolvedValue('http://joesdiner.com');
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
      locationProvider.getDetails.mockResolvedValue(
        detailsFixture({ websiteUri: 'http://joesdiner.com', rating: 4.2, userRatingCount: 30 }),
      );
      businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: true });
      leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-1', wasNew: true });

      await runner.run(params);

      expect(locationProvider.getDetails).toHaveBeenCalledWith('place_1');
      expect(costService.charge).toHaveBeenCalledWith(
        'google_places_details_full',
        expect.any(Number),
        expect.objectContaining({ placeId: 'place_1' }),
      );
      expect(businessService.upsertByPlaceId).toHaveBeenCalledWith(
        expect.objectContaining({
          websiteDetectionMethod: WebsiteDetectionMethod.HEURISTIC_SCAN,
          rating: 4.2,
          reviewCount: 30,
        }),
      );
      expect(leadsService.ensureForBusiness).toHaveBeenCalledWith('biz-1');
    });

    it('reserves the charge before making the external call, not after (audit finding #1)', async () => {
      const callOrder: string[] = [];
      costService.charge.mockImplementation(async () => {
        callOrder.push('charge');
      });
      locationProvider.search.mockImplementation(async () => {
        callOrder.push('search');
        return { candidates: [candidate], nextPageToken: undefined };
      });
      locationProvider.getWebsiteUri.mockImplementation(async () => {
        callOrder.push('getWebsiteUri');
        return null;
      });
      locationProvider.getDetails.mockImplementation(async () => {
        callOrder.push('getDetails');
        return detailsFixture();
      });
      businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: true });
      leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-1', wasNew: true });

      await runner.run(params);

      expect(callOrder).toEqual([
        'charge',
        'search',
        'charge',
        'getWebsiteUri',
        'charge',
        'getDetails',
      ]);
    });

    it('does not proceed with the external call when the charge is rejected (over budget)', async () => {
      locationProvider.search.mockResolvedValue({
        candidates: [candidate],
        nextPageToken: undefined,
      });
      costService.charge
        .mockResolvedValueOnce(undefined) // search charge succeeds
        .mockRejectedValueOnce(new Error('over budget')); // website-check charge rejected

      await runner.run(params);

      expect(locationProvider.getWebsiteUri).not.toHaveBeenCalled();
      // caught per-candidate (FR-1.8) — job still completes, just with 0 results
      expect(prisma.discoveryJob.update).toHaveBeenLastCalledWith({
        where: { id: 'job-1' },
        data: { status: DiscoveryJobStatus.COMPLETED, resultsCount: 0 },
      });
    });

    it('caches the website-check result and skips both Places calls and the fetch on a hit', async () => {
      locationProvider.search.mockResolvedValue({
        candidates: [candidate],
        nextPageToken: undefined,
      });
      cache.getJson.mockResolvedValue({
        websiteUri: null,
        status: 'none',
        detectionMethod: WebsiteDetectionMethod.GOOGLE_API,
      });
      locationProvider.getDetails.mockResolvedValue(detailsFixture());
      businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: true });
      leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-1', wasNew: true });

      await runner.run(params);

      expect(locationProvider.getWebsiteUri).not.toHaveBeenCalled();
      expect(websiteFetchAdapter.fetch).not.toHaveBeenCalled();
    });
  });
});
