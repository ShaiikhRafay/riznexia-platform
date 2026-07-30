import { PlaceSyncJobStatus, WebsiteDetectionMethod, WebsiteStatusType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { RedisCacheService } from '@riznexia/cache';
import type { LocationProvider } from '../common/providers/location-provider.interface';
import type { WebsiteFetchAdapter } from '../common/adapters/website-fetch.adapter';
import type { WebsiteStatusClassifier } from '../common/classifiers/website-status.classifier';
import type { CostService } from '../common/cost/cost.service';
import type { BusinessService } from '../business/business.service';
import type { LeadsService } from '../leads/leads.service';
import { PlaceSyncRunnerService } from './place-sync-runner.service';

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

describe('PlaceSyncRunnerService', () => {
  let locationProvider: { search: jest.Mock; getWebsiteUri: jest.Mock; getDetails: jest.Mock };
  let websiteFetchAdapter: { fetch: jest.Mock };
  let classifier: { classify: jest.Mock };
  let businessService: { findByPlaceId: jest.Mock; upsertByPlaceId: jest.Mock };
  let leadsService: { ensureForBusiness: jest.Mock };
  let costService: { charge: jest.Mock };
  let prisma: { placeSyncJob: { update: jest.Mock } };
  let cache: { getJson: jest.Mock; setJson: jest.Mock };
  let runner: PlaceSyncRunnerService;

  const params = { placeSyncJobId: 'job-1', city: 'Karachi', category: 'restaurant' };
  const candidate = {
    providerId: 'place_1',
    displayName: "Joe's Diner",
    formattedAddress: '123 Main St',
    primaryType: 'restaurant',
    types: ['restaurant'],
    latitude: 24.86,
    longitude: 67.01,
  };

  beforeEach(() => {
    locationProvider = { search: jest.fn(), getWebsiteUri: jest.fn(), getDetails: jest.fn() };
    websiteFetchAdapter = { fetch: jest.fn() };
    classifier = { classify: jest.fn() };
    businessService = { findByPlaceId: jest.fn(), upsertByPlaceId: jest.fn() };
    leadsService = { ensureForBusiness: jest.fn() };
    costService = { charge: jest.fn().mockResolvedValue(undefined) };
    prisma = { placeSyncJob: { update: jest.fn().mockResolvedValue({}) } };
    cache = { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn() };

    runner = new PlaceSyncRunnerService(
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

  it('transitions QUEUED -> RUNNING -> COMPLETED with progress + cost fields on a clean run', async () => {
    locationProvider.search.mockResolvedValue({
      candidates: [candidate],
      nextPageToken: undefined,
    });
    locationProvider.getWebsiteUri.mockResolvedValue(null);
    locationProvider.getDetails.mockResolvedValue(detailsFixture());
    businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: true });
    leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-1', wasNew: true });

    await runner.run(params);

    expect(prisma.placeSyncJob.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'job-1' },
      data: { status: PlaceSyncJobStatus.RUNNING, startedAt: expect.any(Date) },
    });
    expect(prisma.placeSyncJob.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'job-1' },
      data: { businessesFound: 1, apiCallsUsed: 1, estimatedCost: expect.any(Number) },
    });
    const finalCall = prisma.placeSyncJob.update.mock.calls[2] as [
      { data: Record<string, unknown> },
    ];
    expect(finalCall[0].data).toMatchObject({
      status: PlaceSyncJobStatus.COMPLETED,
      businessesCreated: 1,
      businessesUpdated: 0,
      businessesFailed: 0,
      successRate: 1,
    });
  });

  it('marks the job FAILED when the search itself fails even after retries', async () => {
    locationProvider.search.mockRejectedValue(new Error('quota exceeded'));

    await runner.run(params);

    const lastCall = prisma.placeSyncJob.update.mock.calls.at(-1) as [
      { data: Record<string, unknown> },
    ];
    expect(lastCall[0].data).toMatchObject({
      status: PlaceSyncJobStatus.FAILED,
      errorMessage: 'quota exceeded',
    });
  });

  it('marks the job PARTIAL when some candidates fail and some succeed', async () => {
    const good = { ...candidate, providerId: 'place_good' };
    const bad = { ...candidate, providerId: 'place_bad' };
    locationProvider.search.mockResolvedValue({
      candidates: [good, bad],
      nextPageToken: undefined,
    });
    locationProvider.getWebsiteUri.mockImplementation((id: string) =>
      id === 'place_bad' ? Promise.reject(new Error('boom')) : Promise.resolve(null),
    );
    locationProvider.getDetails.mockResolvedValue(detailsFixture());
    businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-good', wasNew: true });
    leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-good', wasNew: true });

    await runner.run(params);

    const lastCall = prisma.placeSyncJob.update.mock.calls.at(-1) as [
      { data: Record<string, unknown> },
    ];
    expect(lastCall[0].data).toMatchObject({
      status: PlaceSyncJobStatus.PARTIAL,
      businessesCreated: 1,
      businessesFailed: 1,
    });
  });

  it('marks the job FAILED (not PARTIAL) when every candidate fails', async () => {
    locationProvider.search.mockResolvedValue({
      candidates: [candidate],
      nextPageToken: undefined,
    });
    locationProvider.getWebsiteUri.mockRejectedValue(new Error('boom'));

    await runner.run(params);

    const lastCall = prisma.placeSyncJob.update.mock.calls.at(-1) as [
      { data: Record<string, unknown> },
    ];
    expect(lastCall[0].data).toMatchObject({
      status: PlaceSyncJobStatus.FAILED,
      businessesFailed: 1,
    });
  });

  it('retries a transient provider failure before giving up on a candidate', async () => {
    locationProvider.search.mockResolvedValue({
      candidates: [candidate],
      nextPageToken: undefined,
    });
    locationProvider.getWebsiteUri
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(null);
    locationProvider.getDetails.mockResolvedValue(detailsFixture());
    businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: true });
    leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-1', wasNew: true });

    await runner.run(params);

    expect(locationProvider.getWebsiteUri).toHaveBeenCalledTimes(2);
    const lastCall = prisma.placeSyncJob.update.mock.calls.at(-1) as [
      { data: Record<string, unknown> },
    ];
    expect(lastCall[0].data).toMatchObject({ status: PlaceSyncJobStatus.COMPLETED });
  });

  it('passes provider details through to BusinessService.upsertByPlaceId with lastSyncJobId set', async () => {
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
      detailsFixture({
        rating: 4.2,
        userRatingCount: 30,
        phone: '+92 300',
        profileUrl: 'https://maps.google.com/x',
      }),
    );
    businessService.upsertByPlaceId.mockResolvedValue({ id: 'biz-1', wasNew: true });
    leadsService.ensureForBusiness.mockResolvedValue({ id: 'lead-1', wasNew: true });

    await runner.run(params);

    expect(businessService.upsertByPlaceId).toHaveBeenCalledWith(
      expect.objectContaining({
        lastSyncJobId: 'job-1',
        websiteStatus: WebsiteStatusType.OUTDATED,
        websiteDetectionMethod: WebsiteDetectionMethod.HEURISTIC_SCAN,
        rating: 4.2,
        reviewCount: 30,
        phone: '+92 300',
        googleBusinessUrl: 'https://maps.google.com/x',
      }),
    );
    expect(leadsService.ensureForBusiness).toHaveBeenCalledWith('biz-1');
  });

  it('does not persist a brand-new present candidate, and does not count it toward success or failure', async () => {
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

    expect(businessService.upsertByPlaceId).not.toHaveBeenCalled();
    const lastCall = prisma.placeSyncJob.update.mock.calls.at(-1) as [
      { data: Record<string, unknown> },
    ];
    expect(lastCall[0].data).toMatchObject({
      status: PlaceSyncJobStatus.COMPLETED,
      businessesCreated: 0,
      businessesUpdated: 0,
      businessesFailed: 0,
      successRate: null,
    });
  });
});
