import type { PrismaClient } from '@riznexia/db';
import { LeadNotFoundException } from '../../common/exceptions/app.exception';
import { WebsiteStatusService } from './website-status.service';

describe('WebsiteStatusService', () => {
  let prisma: {
    lead: { findUnique: jest.Mock };
    businessAnalysis: { findFirst: jest.Mock };
    themeConfiguration: { findFirst: jest.Mock };
    layoutConfiguration: { findFirst: jest.Mock };
    componentManifest: { findFirst: jest.Mock };
    contentManifest: { findFirst: jest.Mock };
    generatedWebsite: { findFirst: jest.Mock };
    websitePreview: { findFirst: jest.Mock };
    publishReadinessReport: { findFirst: jest.Mock };
  };
  let service: WebsiteStatusService;

  beforeEach(() => {
    prisma = {
      lead: { findUnique: jest.fn().mockResolvedValue({ businessId: 'business-1' }) },
      businessAnalysis: { findFirst: jest.fn().mockResolvedValue(null) },
      themeConfiguration: { findFirst: jest.fn().mockResolvedValue(null) },
      layoutConfiguration: { findFirst: jest.fn().mockResolvedValue(null) },
      componentManifest: { findFirst: jest.fn().mockResolvedValue(null) },
      contentManifest: { findFirst: jest.fn().mockResolvedValue(null) },
      generatedWebsite: { findFirst: jest.fn().mockResolvedValue(null) },
      websitePreview: { findFirst: jest.fn().mockResolvedValue(null) },
      publishReadinessReport: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    service = new WebsiteStatusService(prisma as unknown as PrismaClient);
  });

  it('throws LeadNotFoundException for an unknown lead', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);
    await expect(service.getForLead('missing')).rejects.toBeInstanceOf(LeadNotFoundException);
  });

  it('reports not_started when nothing exists yet', async () => {
    const result = await service.getForLead('lead-1');
    expect(result.stage).toBe('not_started');
    expect(result.hasAnalysis).toBe(false);
    expect(result.generatedWebsiteVersion).toBeNull();
    expect(result.publishReadinessScore).toBeNull();
  });

  it('reports analyzed when only BusinessAnalysis exists', async () => {
    prisma.businessAnalysis.findFirst.mockResolvedValue({ id: 'a' });
    const result = await service.getForLead('lead-1');
    expect(result.stage).toBe('analyzed');
    expect(result.hasAnalysis).toBe(true);
    expect(result.hasTheme).toBe(false);
  });

  it('reports preview_ready with a real score when every milestone is reached', async () => {
    prisma.businessAnalysis.findFirst.mockResolvedValue({ id: 'a' });
    prisma.themeConfiguration.findFirst.mockResolvedValue({ id: 't' });
    prisma.layoutConfiguration.findFirst.mockResolvedValue({ id: 'l' });
    prisma.componentManifest.findFirst.mockResolvedValue({ id: 'c' });
    prisma.contentManifest.findFirst.mockResolvedValue({ id: 'ct' });
    prisma.generatedWebsite.findFirst.mockResolvedValue({ configVersion: 2 });
    prisma.websitePreview.findFirst.mockResolvedValue({ id: 'p' });
    prisma.publishReadinessReport.findFirst.mockResolvedValue({
      overallPublishScore: { score: 88 },
    });

    const result = await service.getForLead('lead-1');

    expect(result.stage).toBe('preview_ready');
    expect(result.generatedWebsiteVersion).toBe(2);
    expect(result.publishReadinessScore).toBe(88);
  });

  it('stops advancing at the first missing milestone even if a later one exists (defensive against inconsistent data)', async () => {
    prisma.businessAnalysis.findFirst.mockResolvedValue({ id: 'a' });
    // theme missing, but a generated website somehow exists (shouldn't happen in practice)
    prisma.generatedWebsite.findFirst.mockResolvedValue({ configVersion: 1 });

    const result = await service.getForLead('lead-1');

    expect(result.stage).toBe('analyzed');
  });
});
