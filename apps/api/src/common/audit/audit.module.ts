import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from './audit-log.service';

// Module M3 (DECISIONS.md D-023). Global so any feature module can
// `@Audited()` a route without importing this module, and so
// AuditLogService is injectable anywhere a privileged action needs to be
// recorded outside the decorator/interceptor shape.
@Global()
@Module({
  providers: [AuditLogService, { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }],
  exports: [AuditLogService],
})
export class AuditModule {}
