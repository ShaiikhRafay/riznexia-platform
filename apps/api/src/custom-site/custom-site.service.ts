import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@riznexia/db';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  BusinessNotFoundException,
  LeadNotFoundException,
  UpstreamProviderException,
} from '../common/exceptions/app.exception';
import {
  DEPLOYMENT_PROVIDER,
  type DeploymentProvider,
} from '../deployment/provider/deployment-provider.interface';
import { toProjectName } from '../deployment/engine/project-name';
import { LeadsService } from '../leads/leads.service';
import { BusinessService } from '../business/business.service';
import {
  CustomSiteInvalidException,
  CustomSiteNotFoundException,
  DeploymentProviderNotConfiguredException,
} from './custom-site.exceptions';
import { validateSite, type SiteFile } from './site-validator';
import { readZip, ZipError } from './zip.util';

export interface CustomSiteDeploymentView {
  id: string;
  customSiteId: string;
  status: 'in_progress' | 'completed' | 'failed';
  liveUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CustomSiteView {
  id: string;
  version: number;
  fileCount: number;
  totalBytes: number;
  warnings: string[];
  createdAt: string;
  deployments: CustomSiteDeploymentView[];
}

const CUSTOM_SITE_ENGINE_VERSION = 'custom-site-v1.0';

// Sites built by Claude Code from a BRIEF.md and uploaded as site.zip.
// Deliberately separate from GeneratedWebsite/WebsiteDeployment (M8/M11),
// whose FKs and M9 validation assume the rule-based generator; this reuses
// only the provider-agnostic DEPLOYMENT_PROVIDER (Vercel).
@Injectable()
export class CustomSiteService {
  private readonly logger = new Logger(CustomSiteService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(DEPLOYMENT_PROVIDER) private readonly provider: DeploymentProvider,
    private readonly leadsService: LeadsService,
    private readonly businessService: BusinessService,
  ) {}

  private async businessIdFor(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) throw new LeadNotFoundException();
    return lead.businessId;
  }

  async upload(leadId: string, zip: Buffer, userId: string): Promise<CustomSiteView> {
    const businessId = await this.businessIdFor(leadId);
    let entries;
    try {
      entries = readZip(zip);
    } catch (e) {
      if (e instanceof ZipError) throw new CustomSiteInvalidException([e.message]);
      throw e;
    }
    const result = validateSite(entries);
    if (!result.ok) throw new CustomSiteInvalidException(result.errors, result.warnings);

    const hash = createHash('sha256');
    for (const f of [...result.files].sort((a, b) => a.path.localeCompare(b.path))) {
      hash.update(f.path).update('\0').update(f.content).update('\0');
    }
    const last = await this.prisma.customSite.findFirst({
      where: { businessId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const row = await this.prisma.customSite.create({
      data: {
        businessId,
        version: (last?.version ?? 0) + 1,
        files: result.files as unknown as object,
        fileCount: result.files.length,
        totalBytes: result.totalBytes,
        contentHash: hash.digest('hex'),
        warnings: result.warnings,
        createdById: userId,
      },
    });
    return this.toView(row, []);
  }

  async list(leadId: string): Promise<CustomSiteView[]> {
    const businessId = await this.businessIdFor(leadId);
    const rows = await this.prisma.customSite.findMany({
      where: { businessId },
      orderBy: { version: 'desc' },
      take: 20,
      select: {
        id: true,
        version: true,
        fileCount: true,
        totalBytes: true,
        warnings: true,
        createdAt: true,
        deployments: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    const views: CustomSiteView[] = [];
    for (const r of rows) {
      const deps = await Promise.all(r.deployments.map((d) => this.refreshIfPending(d)));
      views.push(this.toView(r, deps));
    }
    return views;
  }

  async deploy(leadId: string, siteId: string, userId: string): Promise<CustomSiteDeploymentView> {
    const businessId = await this.businessIdFor(leadId);
    if (!this.provider.isConfigured()) throw new DeploymentProviderNotConfiguredException();
    const site = await this.prisma.customSite.findFirst({ where: { id: siteId, businessId } });
    if (!site) throw new CustomSiteNotFoundException();
    const business = await this.businessService.findById(businessId);
    if (!business) throw new BusinessNotFoundException();

    const dep = await this.prisma.customSiteDeployment.create({
      data: {
        businessId,
        customSiteId: site.id,
        status: 'in_progress',
        engineVersion: CUSTOM_SITE_ENGINE_VERSION,
        createdById: userId,
      },
    });
    try {
      const files = (site.files as unknown as SiteFile[]).map((f) => ({
        path: f.path,
        content: f.content,
      }));
      const res = await this.provider.deploy({
        files,
        projectName: toProjectName(business.businessName, businessId),
        environment: 'production',
      });
      const updated = await this.prisma.customSiteDeployment.update({
        where: { id: dep.id },
        data: { providerDeploymentId: res.providerDeploymentId, liveUrl: res.liveUrl },
      });
      return this.toDepView(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deployment failed';
      this.logger.warn(`Custom site deploy failed: ${msg}`);
      const failed = await this.prisma.customSiteDeployment.update({
        where: { id: dep.id },
        data: { status: 'failed', errorMessage: msg.slice(0, 500), completedAt: new Date() },
      });
      if (e instanceof UpstreamProviderException) throw e;
      return this.toDepView(failed);
    }
  }

  /** Latest completed live URL for a business, or the latest in-progress one. */
  async bestLiveUrl(
    businessId: string,
  ): Promise<{ liveUrl: string | null; status: string | null }> {
    const deps = await this.prisma.customSiteDeployment.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const refreshed = await Promise.all(deps.map((d) => this.refreshIfPending(d)));
    const done = refreshed.find((d) => d.status === 'completed' && d.liveUrl);
    if (done) return { liveUrl: done.liveUrl, status: 'completed' };
    return { liveUrl: null, status: refreshed[0]?.status ?? null };
  }

  private async refreshIfPending<T extends DepRow>(d: T): Promise<CustomSiteDeploymentView> {
    if (d.status !== 'in_progress' || !d.providerDeploymentId) return this.toDepView(d);
    try {
      const s = await this.provider.getStatus(d.providerDeploymentId);
      if (s.status === 'building') return this.toDepView(d);
      const updated = await this.prisma.customSiteDeployment.update({
        where: { id: d.id },
        data:
          s.status === 'ready'
            ? { status: 'completed', liveUrl: s.liveUrl ?? d.liveUrl, completedAt: new Date() }
            : {
                status: 'failed',
                errorMessage: s.errorMessage ?? 'Build failed on Vercel',
                completedAt: new Date(),
              },
      });
      return this.toDepView(updated);
    } catch {
      return this.toDepView(d);
    }
  }

  private toDepView(d: DepRow): CustomSiteDeploymentView {
    return {
      id: d.id,
      customSiteId: d.customSiteId,
      status: d.status as CustomSiteDeploymentView['status'],
      liveUrl: d.liveUrl,
      errorMessage: d.errorMessage,
      createdAt: d.createdAt.toISOString(),
      completedAt: d.completedAt ? d.completedAt.toISOString() : null,
    };
  }

  private toView(
    r: {
      id: string;
      version: number;
      fileCount: number;
      totalBytes: number;
      warnings: unknown;
      createdAt: Date;
    },
    deployments: CustomSiteDeploymentView[],
  ): CustomSiteView {
    return {
      id: r.id,
      version: r.version,
      fileCount: r.fileCount,
      totalBytes: r.totalBytes,
      warnings: Array.isArray(r.warnings) ? (r.warnings as string[]) : [],
      createdAt: r.createdAt.toISOString(),
      deployments,
    };
  }
}

interface DepRow {
  id: string;
  customSiteId: string;
  status: string;
  providerDeploymentId: string | null;
  liveUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}
