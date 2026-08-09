import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './analytics/dashboard/dashboard.module';
import { ExportModule } from './analytics/export/export.module';
import { ReportingModule as AnalyticsReportingModule } from './analytics/reporting/reporting.module';
import { AuditModule } from './common/audit/audit.module';
import { CacheModule } from './common/cache/cache.module';
import { CostModule } from './common/cost/cost.module';
import { DatabaseModule } from './common/database/database.module';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { RbacModule } from './common/rbac/rbac.module';
import { BusinessAnalysisModule } from './business-analysis/business-analysis.module';
import { ComponentEngineModule } from './component-engine/component-engine.module';
import { ContentEngineModule } from './content-engine/content-engine.module';
import { ActivityModule } from './crm/activities/activity.module';
import { PipelineModule } from './crm/pipeline/pipeline.module';
import { ProposalModule } from './crm/proposals/proposal.module';
import { ReportingModule as CrmReportingModule } from './crm/reporting/reporting.module';
import { TaskModule } from './crm/tasks/task.module';
import { DomainModule } from './deployment/domain/domain.module';
import { EngineModule } from './deployment/engine/engine.module';
import { RollbackModule } from './deployment/rollback/rollback.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { HealthModule } from './health/health.module';
import { LayoutEngineModule } from './layout-engine/layout-engine.module';
import { LeadsModule } from './leads/leads.module';
import { PlaceSyncModule } from './place-sync/place-sync.module';
import { ThemeSelectionModule } from './theme-engine/theme-selection.module';
import { WebsiteAssemblyModule } from './website-assembly/website-assembly.module';
import { WebsitePreviewModule } from './website-preview/website-preview.module';

// Root module. Feature modules beyond auth/discovery/leads (Doc 16 §3
// bounded contexts: generation, deployment, pitch, team) are added here
// as their own modules per Doc 21's module plan, one at a time.
//
// RateLimitModule is listed before AuthModule so its global guard (an
// IP-based abuse check, cheap and identity-agnostic) runs ahead of the
// Clerk auth chain — a flooding client is rejected before we spend a
// token-verification round trip on it. RbacModule is listed after AuthModule
// so its guards (MinRoleGuard, PermissionsGuard) run after ClerkAuthGuard/
// RolesGuard — the full chain is Clerk -> Roles -> MinRole -> Permissions
// (Doc 16 §15, extended for Module M3, DECISIONS.md D-023).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CacheModule,
    CostModule,
    RateLimitModule,
    AuthModule,
    RbacModule,
    AuditModule,
    HealthModule,
    LeadsModule,
    DiscoveryModule,
    PlaceSyncModule,
    BusinessAnalysisModule,
    ThemeSelectionModule,
    LayoutEngineModule,
    ComponentEngineModule,
    ContentEngineModule,
    WebsiteAssemblyModule,
    WebsitePreviewModule,
    PipelineModule,
    TaskModule,
    ActivityModule,
    ProposalModule,
    CrmReportingModule,
    EngineModule,
    RollbackModule,
    DomainModule,
    DashboardModule,
    AnalyticsReportingModule,
    ExportModule,
  ],
})
export class AppModule {}
