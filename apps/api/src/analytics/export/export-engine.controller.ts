import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  exportQuerySchema,
  reportTypeSchema,
  type ExportQuery,
  type ReportType,
} from '@riznexia/shared-types';
import type { Response } from 'express';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ExportEngineService } from './export-engine.service';

// GET /analytics/reports/:type/export — CSV is a real, downloadable
// response (Content-Disposition: attachment); PDF/Excel reject with
// EXPORT_FORMAT_NOT_IMPLEMENTED before this handler ever builds a
// response body.
@Controller('analytics/reports/:type/export')
export class ExportEngineController {
  constructor(private readonly exportEngineService: ExportEngineService) {}

  @Get()
  @RequirePermissions('analytics:export')
  async export(
    @Param('type', new ZodValidationPipe(reportTypeSchema)) type: ReportType,
    @Query(new ZodValidationPipe(exportQuerySchema)) query: ExportQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const result = await this.exportEngineService.exportReport(type, query);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return result.content;
  }
}
