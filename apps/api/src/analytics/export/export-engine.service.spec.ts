import { ExportFormatNotImplementedException } from '../../common/exceptions/app.exception';
import type { AnalyticsProvider } from '../provider/analytics-provider.interface';
import type { ReportingEngineService } from '../reporting/reporting-engine.service';
import { ExportEngineService } from './export-engine.service';

describe('ExportEngineService', () => {
  let reportingEngineService: { generateReport: jest.Mock };
  let analyticsProvider: { track: jest.Mock };
  let service: ExportEngineService;

  beforeEach(() => {
    reportingEngineService = {
      generateReport: jest.fn().mockResolvedValue({
        reportType: 'business_category',
        data: { byCategory: [{ label: 'restaurant', count: 10 }] },
      }),
    };
    analyticsProvider = { track: jest.fn().mockResolvedValue(undefined) };
    service = new ExportEngineService(
      reportingEngineService as unknown as ReportingEngineService,
      analyticsProvider as unknown as AnalyticsProvider,
    );
  });

  it('rejects pdf with ExportFormatNotImplementedException, never computing the report', async () => {
    await expect(
      service.exportReport('business_category', { format: 'pdf', period: 'monthly' }),
    ).rejects.toBeInstanceOf(ExportFormatNotImplementedException);
    expect(reportingEngineService.generateReport).not.toHaveBeenCalled();
  });

  it('rejects excel with ExportFormatNotImplementedException', async () => {
    await expect(
      service.exportReport('business_category', { format: 'excel', period: 'monthly' }),
    ).rejects.toBeInstanceOf(ExportFormatNotImplementedException);
  });

  it('generates the report and formats it as CSV for format=csv', async () => {
    const result = await service.exportReport('business_category', {
      format: 'csv',
      period: 'monthly',
    });

    expect(reportingEngineService.generateReport).toHaveBeenCalledWith('business_category', {
      period: 'monthly',
      fromDate: undefined,
      toDate: undefined,
      limit: 1000,
    });
    expect(result.contentType).toBe('text/csv');
    expect(result.content).toBe('label,count\nrestaurant,10');
    expect(result.filename).toMatch(/^business_category-monthly-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('tracks export_started and export_completed analytics events through the injected provider', async () => {
    await service.exportReport('business_category', { format: 'csv', period: 'monthly' });
    expect(analyticsProvider.track).toHaveBeenNthCalledWith(1, {
      eventType: 'export_started',
      entityType: 'AnalyticsReport',
      entityId: 'business_category',
      metadata: { format: 'csv' },
    });
    expect(analyticsProvider.track).toHaveBeenNthCalledWith(2, {
      eventType: 'export_completed',
      entityType: 'AnalyticsReport',
      entityId: 'business_category',
      metadata: { format: 'csv' },
    });
  });

  it('does not fail the export when tracking itself throws (best-effort)', async () => {
    analyticsProvider.track.mockRejectedValue(new Error('provider down'));
    await expect(
      service.exportReport('business_category', { format: 'csv', period: 'monthly' }),
    ).resolves.toMatchObject({
      contentType: 'text/csv',
    });
  });
});
