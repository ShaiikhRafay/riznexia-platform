import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ExportQuery, ReportType } from '@riznexia/shared-types';
import { ExportFormatNotImplementedException } from '../../common/exceptions/app.exception';
import {
  ANALYTICS_PROVIDER,
  type AnalyticsProvider,
} from '../provider/analytics-provider.interface';
import { ReportingEngineService } from '../reporting/reporting-engine.service';
import { toCsv } from './csv-formatter';

export interface ExportResult {
  filename: string;
  content: string;
  contentType: string;
}

// An export has no pagination UI, so it requests a generous but bounded
// page of rows for report types that paginate (e.g. `audit`) — large
// enough to cover the common case, still finite (Decision 10: "avoid
// unnecessary database scans").
const EXPORT_ROW_LIMIT = 1000;

// Module M12 (DECISIONS.md D-109) — Export Engine. Founder's explicit
// Decision 7: CSV is implemented; PDF/Excel are "architecture only" — a
// request for either rejects with ExportFormatNotImplementedException,
// never a silent fallback to CSV. Never a second report implementation:
// every export runs the exact same ReportingEngineService.generateReport()
// the JSON endpoint uses, then only reformats the already-computed data.
@Injectable()
export class ExportEngineService {
  private readonly logger = new Logger(ExportEngineService.name);

  constructor(
    private readonly reportingEngineService: ReportingEngineService,
    @Inject(ANALYTICS_PROVIDER) private readonly analyticsProvider: AnalyticsProvider,
  ) {}

  async exportReport(type: ReportType, query: ExportQuery): Promise<ExportResult> {
    if (query.format !== 'csv') {
      throw new ExportFormatNotImplementedException(query.format);
    }

    this.logger.log(`Export Started: type=${type}, format=${query.format}`);
    await this.trackBestEffort({
      eventType: 'export_started',
      entityType: 'AnalyticsReport',
      entityId: type,
      metadata: { format: query.format },
    });

    const report = await this.reportingEngineService.generateReport(type, {
      period: query.period,
      fromDate: query.fromDate,
      toDate: query.toDate,
      limit: EXPORT_ROW_LIMIT,
    });
    const content = toCsv(report.data);
    const filename = `${type}-${query.period}-${new Date().toISOString().slice(0, 10)}.csv`;

    this.logger.log(`Export Completed: type=${type}, format=${query.format}`);
    await this.trackBestEffort({
      eventType: 'export_completed',
      entityType: 'AnalyticsReport',
      entityId: type,
      metadata: { format: query.format },
    });

    return { filename, content, contentType: 'text/csv' };
  }

  /**
   * Best-effort — same precedent as AuditLogService.record(): a failure
   * to track must never fail the export it describes.
   */
  private async trackBestEffort(input: Parameters<AnalyticsProvider['track']>[0]): Promise<void> {
    try {
      await this.analyticsProvider.track(input);
    } catch (error) {
      this.logger.warn(
        `Failed to track analytics event "${input.eventType}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
